
export interface Keypoint {
    x: number;
    y: number;
    score?: number;
    name?: string;
}

export interface Pose {
    keypoints: Keypoint[];
    score?: number;
}

export const SwingPhase = {
    Address: 'Address',
    Backswing: 'Backswing',
    Top: 'Top',
    Downswing: 'Downswing',
    Impact: 'Impact',
    FollowThrough: 'FollowThrough',
    Finish: 'Finish',
    IDLE: 'IDLE'
} as const;

export type SwingPhase = typeof SwingPhase[keyof typeof SwingPhase];

export interface JointMetric {
    name: string;
    angle: number;       // Current angle in degrees
    velocity: number;    // Angular velocity in deg/s
    acceleration: number; // Angular acceleration in deg/s^2
    min: number;         // Min angle in window
    max: number;         // Max angle in window
}

export interface GolfMetrics {
    shoulderTilt: number;
    hipTilt: number;
    spineAngle: number;
    xFactor: number;
}

export interface SegmentLengths {
    upperArm: number; // Shoulder to Elbow
    forearm: number;  // Elbow to Wrist
    thigh: number;    // Hip to Knee
    shin: number;     // Knee to Ankle
}

export interface IKResult {
    target: { x: number; y: number };
    shoulderAngle: number;
    elbowAngle: number;
    // Computed positions for visualization
    shoulder: { x: number; y: number };
    elbow: { x: number; y: number };
    wrist: { x: number; y: number };
}

export interface KinematicsState {
    joints: Record<string, JointMetric>;
    segmentLengths: SegmentLengths;
    ik?: IKResult;
    phase?: SwingPhase;
    // Legacy Golf Data (Keep optional for compatibility if needed, but we are moving away)
    golf?: GolfMetrics;
    history: Record<string, number[]>; // Store last N angles provided key
    handPath: { x: number; y: number }[]; // Trail of hand positions
    timestamp: number;
}
