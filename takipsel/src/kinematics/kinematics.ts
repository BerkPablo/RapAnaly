import type { Keypoint, KinematicsState, Pose, SwingPhase } from '../pose/types';
import { calculateAngle, ema } from './geometry';

const HISTORY_SIZE = 120; // Frames to keep
const SMOOTHING_ALPHA = 0.5; // EMA alpha

export class KinematicsEngine {
    private history: Record<string, number[]> = {};
    private lastTimestamp: number = 0;
    private lastAngles: Record<string, number> = {};
    private lastValidMetrics: Record<string, { metric: any, timestamp: number }> = {};

    constructor() { }

    // Mapping of common joints to their 3 keypoint names (A, B, C) where B is the joint
    // MoveNet Keypoints: nose, left_eye, right_eye, left_ear, right_ear, left_shoulder, right_shoulder, 
    // left_elbow, right_elbow, left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle
    private jointDefinitions = {
        'Right Elbow': ['right_shoulder', 'right_elbow', 'right_wrist'],
        'Left Elbow': ['left_shoulder', 'left_elbow', 'left_wrist'],
        'Right Knee': ['right_hip', 'right_knee', 'right_ankle'],
        'Left Knee': ['left_hip', 'left_knee', 'left_ankle'],
        'Right Shoulder': ['right_hip', 'right_shoulder', 'right_elbow'],
        'Left Shoulder': ['left_hip', 'left_shoulder', 'left_elbow'],
    };


    private handPath: { x: number; y: number }[] = [];
    private readonly MAX_PATH_LENGTH = 50;

    // Stability & Validation
    private addressStabilityFrames = 0;
    private readonly REQUIRED_ADDRESS_FRAMES = 15; // ~0.5s at 30fps
    private readonly MIN_CONFIDENCE = 0.2; // Reduced for better tracking during fast motion

    private currentPhase: SwingPhase = 'Address';

    public process(pose: Pose, timestamp: number): KinematicsState {
        const kpMap = new Map<string, Keypoint>();
        pose.keypoints.forEach(kp => {
            if (kp.name) kpMap.set(kp.name, kp);
        });

        // 1. Essential Joint Validation (Prevents partial skeleton noise)
        // 1. Essential Joint Validation
        // Relaxed for Side View: We need at least ONE complete side (Shoulder + Hip + Wrist/Knee?) 
        // OR just Torso (Shoulder + Hip) of either side.

        const leftSideValid =
            (kpMap.get('left_shoulder')?.score || 0) >= this.MIN_CONFIDENCE &&
            (kpMap.get('left_hip')?.score || 0) >= this.MIN_CONFIDENCE;

        const rightSideValid =
            (kpMap.get('right_shoulder')?.score || 0) >= this.MIN_CONFIDENCE &&
            (kpMap.get('right_hip')?.score || 0) >= this.MIN_CONFIDENCE;

        const isBodyValid = leftSideValid || rightSideValid;

        // Only enforce strict body validation if we are NOT in an active swing
        // Once swing starts, we rely on persistence and don't want to abort
        const isActiveSwing = this.currentPhase !== 'IDLE' && this.currentPhase !== 'Address';

        if (!isBodyValid && !isActiveSwing) {
            this.addressStabilityFrames = 0;
            this.currentPhase = 'IDLE'; // Force IDLE if body not fully visible
            return {
                phase: 'IDLE',
                joints: {},
                ik: undefined,
                handPath: [],
                segmentLengths: { upperArm: 0, forearm: 0, thigh: 0, shin: 0 },
                history: this.history, // Return current state (likely empty or stale)
                timestamp: timestamp
            };
        }

        const dt = (timestamp - this.lastTimestamp) / 1000; // seconds
        this.lastTimestamp = timestamp;

        // Update Hand Path (Use Left Wrist for right-handed golfer approximation, or midpoint)
        const leftWrist = kpMap.get('left_wrist');
        const rightWrist = kpMap.get('right_wrist');
        let handPos: { x: number, y: number } | null = null;

        if (leftWrist && rightWrist && (leftWrist.score ?? 0) > 0.3) {
            // Use midpoint of hands
            const midX = (leftWrist.x + rightWrist.x) / 2;
            const midY = (leftWrist.y + rightWrist.y) / 2;
            handPos = { x: midX, y: midY };

            // Only track path if NOT in Address phase (reduces visual noise)
            if (this.currentPhase === 'Address') {
                this.handPath = [];
            } else {
                this.handPath.push({ x: midX, y: midY });
                if (this.handPath.length > this.MAX_PATH_LENGTH) {
                    this.handPath.shift();
                }
            }
        }

        const metrics: KinematicsState['joints'] = {};

        for (const [name, [p1, p2, p3]] of Object.entries(this.jointDefinitions)) {
            const a = kpMap.get(p1);
            const b = kpMap.get(p2);
            const c = kpMap.get(p3);

            // Check if we have good confidence
            const hasConfidence = a && b && c && (a.score ?? 0) > 0.3 && (b.score ?? 0) > 0.3 && (c.score ?? 0) > 0.3;

            if (hasConfidence) {
                const rawAngle = calculateAngle(a!, b!, c!); // ! safe because hasConfidence

                // Dynamic Smoothing based on Phase
                // During fast swing (Downswing/Impact), we want responsiveness (higher alpha).
                // During static/holding phases (Address, Finish), we want stability (lower alpha).
                let currentAlpha = SMOOTHING_ALPHA;

                if (this.currentPhase === 'Address' || this.currentPhase === 'Finish') {
                    currentAlpha = 0.2; // Very smooth for static poses
                } else if (this.currentPhase === 'Downswing' || this.currentPhase === 'Impact') {
                    currentAlpha = 0.7; // Responsive for fast movement
                }

                // Smoothing
                const prevAngle = this.lastAngles[name];

                // Outlier Rejection / Jump Clamping
                // If angle changes too much in 1 frame (e.g. > 40 degrees), it's likely a detection error (skeleton flip).
                // We limit the change delta.
                let filteredAngle = rawAngle;

                if (prevAngle !== undefined) {
                    const delta = rawAngle - prevAngle;
                    const MAX_DELTA = (this.currentPhase === 'Downswing' || this.currentPhase === 'Impact') ? 60 : 20;

                    if (Math.abs(delta) > MAX_DELTA) {
                        // Clamp the change
                        filteredAngle = prevAngle + (delta > 0 ? MAX_DELTA : -MAX_DELTA);
                    }
                }

                const angle = ema(filteredAngle, prevAngle, currentAlpha);
                this.lastAngles[name] = angle;

                // History update
                if (!this.history[name]) this.history[name] = [];
                this.history[name].push(angle);
                if (this.history[name].length > HISTORY_SIZE) {
                    this.history[name].shift();
                }

                // Velocity logic
                let velocity = 0;

                if (prevAngle !== undefined && dt > 0) {
                    velocity = (angle - prevAngle) / dt;
                }

                // Store last valid metric
                const vals = this.history[name];
                const metric = {
                    name,
                    angle,
                    velocity,
                    acceleration: 0,
                    min: Math.min(...vals),
                    max: Math.max(...vals)
                };

                metrics[name] = metric;

                // Save as last valid for this joint
                if (!this.lastValidMetrics) this.lastValidMetrics = {};
                this.lastValidMetrics[name] = { metric, timestamp };

            } else {
                // Low confidence: Reuse last valid metric if recent (< 0.5s)
                // For 'Finish' phase, we extend persistence because occlusion is common
                const persistenceDuration = (this.currentPhase === 'Finish') ? 1000 : 500;

                if (!this.lastValidMetrics) this.lastValidMetrics = {};
                const lastValid = this.lastValidMetrics[name];

                if (lastValid && (timestamp - lastValid.timestamp) < persistenceDuration) {
                    // Use stale data but mark it? UI doesn't need to know it's stale, just show it.
                    metrics[name] = lastValid.metric;
                }
            }
        }

        // Detect Phase
        this.detectPhase(handPos, dt);

        return {
            joints: metrics,
            segmentLengths: this.calculateSegmentLengths(kpMap),
            ik: this.calculateIK(kpMap),
            phase: this.currentPhase,
            history: this.history,
            handPath: this.handPath,
            timestamp
        };
    }

    private detectPhase(handPos: { x: number, y: number } | null, dt: number) {
        if (!handPos) return;

        // Simple Vertical Velocity of Hands
        // y is 0 at top, increases downwards. 
        // Moving UP = y decreases = negative velocity.
        // Moving DOWN = y increases = positive velocity.

        const prevY = this.history['hand_y'] ? this.history['hand_y'][this.history['hand_y'].length - 1] : handPos.y;
        const velY = (handPos.y - prevY) / dt;

        if (!this.history['hand_y']) this.history['hand_y'] = [];
        this.history['hand_y'].push(handPos.y);
        if (this.history['hand_y'].length > 10) this.history['hand_y'].shift(); // short memory

        const VEL_THRESHOLD = 80; // px/s (Stricter)

        // State Machine with stricter gates
        switch (this.currentPhase) {
            case 'IDLE':
                // Transition to Address ONLY if hands are very stable for ~1 second
                if (Math.abs(velY) < VEL_THRESHOLD / 3) {
                    this.addressStabilityFrames++;
                } else {
                    this.addressStabilityFrames = 0;
                }

                if (this.addressStabilityFrames > 30) {
                    this.currentPhase = 'Address';
                    this.addressStabilityFrames = 0; // Reset counter for Address phase usage
                }
                break;

            case 'Address':
                // Require stability before allowing swing
                // If velocity increases slightly (waggling), we tolerate it but don't count towards readiness if too high.
                // If velocity is VERY high, we know it's not address.

                if (Math.abs(velY) < VEL_THRESHOLD) {
                    this.addressStabilityFrames++;
                } else {
                    // Reset if movement is too erratic
                    this.addressStabilityFrames = 0;
                }

                // Transition to Backswing ONLY if:
                // 1. We have been stable for a while (Ready) - ~0.5s
                // 2. Hands are moving UP (negative velocity) significantly
                if (velY < -VEL_THRESHOLD * 1.2 && this.addressStabilityFrames > this.REQUIRED_ADDRESS_FRAMES) {
                    this.currentPhase = 'Backswing';
                }
                break;

            case 'Backswing':
                // Transition to Top when velocity slows down near peak
                if (velY > 0) {
                    this.currentPhase = 'Top';
                }
                break;

            case 'Top':
                // Transition to Downswing if fast downward movement
                if (velY > VEL_THRESHOLD * 2) {
                    this.currentPhase = 'Downswing';
                }
                break;

            case 'Downswing':
                // Impact / FollowThrough distinction
                // If hands start slowing down or going up again
                if (velY < 0) {
                    this.currentPhase = 'Impact';
                    // Auto-transition to FollowThrough shortly
                }
                break;

            case 'Impact':
                // Transient state
                this.currentPhase = 'FollowThrough';
                break;

            case 'FollowThrough':
                // If velocity is low, we are finishing
                if (Math.abs(velY) < VEL_THRESHOLD) {
                    this.currentPhase = 'Finish';
                }
                break;

            case 'Finish':
                // Reset to Address if movement stops or pose resets (hands low)
                // Check if hands are low (high y value)
                // Using 300 as vertical cutoff (mid-screen approx)
                if (handPos.y > 300 && Math.abs(velY) < VEL_THRESHOLD) {
                    this.currentPhase = 'Address';
                    this.addressStabilityFrames = 0;
                }
                break;
        }
    }

    private calculateSegmentLengths(kpMap: Map<string, Keypoint>): import('../pose/types').SegmentLengths {
        const dist = (p1Name: string, p2Name: string) => {
            const p1 = kpMap.get(p1Name);
            const p2 = kpMap.get(p2Name);
            if (p1 && p2 && (p1.score ?? 0) > 0.3 && (p2.score ?? 0) > 0.3) {
                return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            }
            return 0;
        };

        // Average left and right for robustness
        return {
            upperArm: (dist('left_shoulder', 'left_elbow') + dist('right_shoulder', 'right_elbow')) / 2,
            forearm: (dist('left_elbow', 'left_wrist') + dist('right_elbow', 'right_wrist')) / 2,
            thigh: (dist('left_hip', 'left_knee') + dist('right_hip', 'right_knee')) / 2,
            shin: (dist('left_knee', 'left_ankle') + dist('right_knee', 'right_ankle')) / 2
        };
    }

    private calculateIK(kpMap: Map<string, Keypoint>): import('../pose/types').IKResult | undefined {
        // Simple 2-Bone IK for Right Arm (Shoulder -> Elbow -> Wrist)
        // Target: We will use the WRIST itself for validation in this POC.
        // In a real scenario, 'target' would be an external point (mouse, animation target etc).

        const shoulder = kpMap.get('right_shoulder');
        const elbow = kpMap.get('right_elbow');
        const wrist = kpMap.get('right_wrist');

        if (!shoulder || !elbow || !wrist || (shoulder.score ?? 0) < 0.3 || (elbow.score ?? 0) < 0.3 || (wrist.score ?? 0) < 0.3) {
            return undefined;
        }

        const L1 = Math.sqrt(Math.pow(elbow.x - shoulder.x, 2) + Math.pow(elbow.y - shoulder.y, 2));
        const L2 = Math.sqrt(Math.pow(wrist.x - elbow.x, 2) + Math.pow(wrist.y - elbow.y, 2));

        // Let's solve for the target being the current wrist position to verify math
        const target = { x: wrist.x, y: wrist.y };

        // Distance from Shoulder to Target
        const D = Math.sqrt(Math.pow(target.x - shoulder.x, 2) + Math.pow(target.y - shoulder.y, 2));

        // Clamp D to be reachable
        const reach = Math.min(D, L1 + L2 - 0.001);

        // Law of Cosines for Elbow Angle (internal angle)
        // D^2 = L1^2 + L2^2 - 2*L1*L2*cos(gamma)
        // cos(gamma) = (L1^2 + L2^2 - D^2) / (2*L1*L2)
        const cosElbow = (L1 * L1 + L2 * L2 - reach * reach) / (2 * L1 * L2);
        const elbowRad = Math.acos(Math.max(-1, Math.min(1, cosElbow))); // Internal angle

        // In our joint definition, elbow angle is usually straighter = 180. 
        // A fully flexed arm is 0 or ~30. 
        // The result here 'elbowRad' is the internal angle of the triangle.

        // Base angle of shoulder (angle of vector S->T)
        const baseAngle = Math.atan2(target.y - shoulder.y, target.x - shoulder.x);

        // Angle alpha (Shoulder -> T vs Shoulder -> Elbow)
        // L2^2 = L1^2 + D^2 - 2*L1*D*cos(alpha)
        const cosAlpha = (L1 * L1 + reach * reach - L2 * L2) / (2 * L1 * reach);
        const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

        // Shoulder Angle relative to horizon
        // Note: Orientation depends on which way the elbow bends (up or down).
        // For a hanging arm, elbow usually bends 'back' relative to the reach line? 
        // We'll assume a standard solution.
        const shoulderRad = baseAngle - alpha;

        // Reconstruct positions for visualization
        const calculatedElbow = {
            x: shoulder.x + L1 * Math.cos(shoulderRad),
            y: shoulder.y + L1 * Math.sin(shoulderRad)
        };

        const calculatedWrist = {
            x: calculatedElbow.x + L2 * Math.cos(shoulderRad + Math.PI - elbowRad), // Relative angle?
            // Actually, global angle of forearm = shoulderRad + (PI - elbowRad) if bending distinct way
            // Let's simplfy: vector E->W is rotated 'elbowRad' from vector S->E? No.
            // If straight line: angles match. 
            // The angle of forearm = shoulderRad + (Math.PI - elbowRad) ?
            y: calculatedElbow.y + L2 * Math.sin(shoulderRad + (Math.PI + elbowRad)) // Check sign
        };

        return {
            target,
            shoulderAngle: (shoulderRad * 180 / Math.PI),
            elbowAngle: (elbowRad * 180 / Math.PI),
            shoulder: { x: shoulder.x, y: shoulder.y },
            elbow: calculatedElbow,
            wrist: calculatedWrist
        };
    }

    reset() {
        this.history = {};
        this.lastAngles = {};
        this.lastTimestamp = 0;
    }
}
