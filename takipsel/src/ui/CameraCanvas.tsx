import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import type { Pose, Keypoint, JointMetric } from '../pose/types';
import { drawKeypoints, drawSkeleton, drawGolfGuides, drawIKOverlay, drawJointAngles } from './drawUtils';
import { detectPose, initDetector } from '../pose/detector';
import { FPSCounter } from '../utils/fps';
import { EnvironmentCheck } from '../utils/EnvironmentCheck';
import { ClubEstimator } from '../kinematics/club';

export interface CameraCanvasHandle {
    canvas: HTMLCanvasElement | null;
    getVideoElement: () => HTMLVideoElement | null;
    getCurrentPoseData: () => { keypoints: Keypoint[], joints: Record<string, JointMetric> };
}

interface Props {
    onPoseUpdate: (pose: Pose) => void;
    onFPSUpdate: (fps: number) => void;
    showSkeleton: boolean;
    minConfidence: number;
    handPath?: { x: number; y: number }[];
    ik?: import('../pose/types').IKResult;
    joints?: Record<string, JointMetric>;
    phase?: string;
}

const VIDEO_WIDTH = 960;
const VIDEO_HEIGHT = 720;
const SMOOTHING_FACTOR = 0.95; // 0.95 = near-instant tracking with slight jitter reduction

export const CameraCanvas = React.forwardRef<CameraCanvasHandle, Props>(({
    onPoseUpdate,
    onFPSUpdate,
    showSkeleton,
    minConfidence,
    handPath,
    ik,
    joints,
    phase
}, ref) => {
    const webcamRef = useRef<Webcam>(null);
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const fpsCounter = useRef(new FPSCounter());
    const [modelLoaded, setModelLoaded] = useState(false);
    const lastPose = useRef<Keypoint[]>([]);
    // Persist keypoints for drawing stability
    const lastValidKeypoints = useRef<{ kp: Keypoint, timestamp: number }[]>([]);

    // Store current pose data for recording
    const currentPoseData = useRef<{ keypoints: Keypoint[], joints: Record<string, JointMetric> }>({
        keypoints: [],
        joints: {}
    });

    // Use refs to store props for the capture loop to avoid stale closures and loop restarts
    const onPoseUpdateRef = useRef(onPoseUpdate);
    const onFPSUpdateRef = useRef(onFPSUpdate);
    const showSkeletonRef = useRef(showSkeleton);
    const minConfidenceRef = useRef(minConfidence);
    const handPathRef = useRef(handPath);
    const ikRef = useRef(ik);
    const jointsRef = useRef(joints);
    const clubEstimator = useRef(new ClubEstimator());

    useEffect(() => {
        onPoseUpdateRef.current = onPoseUpdate;
        onFPSUpdateRef.current = onFPSUpdate;
        showSkeletonRef.current = showSkeleton;
        minConfidenceRef.current = minConfidence;
        handPathRef.current = handPath;
        ikRef.current = ik;
        jointsRef.current = joints;
    }, [onPoseUpdate, onFPSUpdate, showSkeleton, minConfidence, handPath, ik, joints]);

    // Expose canvas, video element, and pose data via ref
    React.useImperativeHandle(ref, () => ({
        canvas: internalCanvasRef.current,
        getVideoElement: () => webcamRef.current?.video || null,
        getCurrentPoseData: () => currentPoseData.current
    }));

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        initDetector().then(() => {
            setModelLoaded(true);
        }).catch((err) => {
            console.error(err);
            setError(err.message || "Failed to load model");
        });
    }, []);

    const envCheck = useRef(new EnvironmentCheck());
    const [isLowLight, setIsLowLight] = useState(false);
    const lastEnvCheck = useRef(0);
    const [distanceStatus, setDistanceStatus] = useState<'too_close' | 'optimal' | 'too_far' | 'unknown'>('unknown');

    useEffect(() => {
        if (!modelLoaded) return;

        let isActive = true;

        const capture = async () => {
            if (
                !isActive ||
                typeof webcamRef.current === "undefined" ||
                webcamRef.current === null ||
                webcamRef.current.video?.readyState !== 4
            ) {
                if (isActive) requestRef.current = requestAnimationFrame(capture);
                return;
            }

            const video = webcamRef.current.video as HTMLVideoElement;
            const now = performance.now();

            try {
                // Run Env Check every ~1000ms
                if (now - lastEnvCheck.current > 1000) {
                    const videoEl = webcamRef.current?.video;
                    if (videoEl) {
                        const { isLowLight: lowLight } = envCheck.current.checkLighting(videoEl);
                        setIsLowLight(lowLight);
                        lastEnvCheck.current = now;
                    }
                }

                const rawPose = await detectPose(video);

                if (rawPose && isActive) {
                    const videoWidth = video.videoWidth;
                    const videoHeight = video.videoHeight;
                    const scaleX = VIDEO_WIDTH / videoWidth;
                    const scaleY = VIDEO_HEIGHT / videoHeight;

                    // Apply EMA Smoothing to keypoints AND Scale + Mirror coordinates
                    const smoothedKeypoints = rawPose.keypoints.map((kp, idx) => {
                        // Mirror X coordinate manually (VIDEO_WIDTH - x) to match mirrored webcam
                        const scaledX = VIDEO_WIDTH - (kp.x * scaleX);
                        const scaledY = kp.y * scaleY;

                        const prevKp = lastPose.current[idx];

                        let smoothedX = scaledX;
                        let smoothedY = scaledY;

                        if (prevKp) {
                            smoothedX = prevKp.x + SMOOTHING_FACTOR * (scaledX - prevKp.x);
                            smoothedY = prevKp.y + SMOOTHING_FACTOR * (scaledY - prevKp.y);
                        }

                        let finalScore = kp.score || 0;

                        // PERSISTENCE LOGIC
                        // If score is low, check if we have a valid history
                        if (finalScore < 0.3) {
                            const lastValid = lastValidKeypoints.current[idx];
                            if (lastValid && (now - lastValid.timestamp) < 800) { // 800ms persistence for finish hold
                                // Use last valid position but lower score slightly to indicate staleness?
                                // For drawing purposes, we pretend it's still valid but let smoothers handle it.
                                // Actually, if we use stale position, smoothing might pull it back.
                                // Let's just USE the stale position if current is garbage.
                                smoothedX = lastValid.kp.x;
                                smoothedY = lastValid.kp.y;
                                finalScore = lastValid.kp.score || 0; // Pretend it's good
                            }
                        } else {
                            // Update valid history if score is good
                            lastValidKeypoints.current[idx] = {
                                kp: { ...kp, x: smoothedX, y: smoothedY },
                                timestamp: now
                            };
                        }

                        return {
                            ...kp,
                            x: smoothedX,
                            y: smoothedY,
                            score: finalScore
                        } as Keypoint;
                    });

                    lastPose.current = smoothedKeypoints;

                    const internalPose: Pose = {
                        keypoints: smoothedKeypoints,
                        score: rawPose.score
                    }

                    // Call ref-based callback
                    onPoseUpdateRef.current(internalPose);

                    // Store current pose data for recording using ref-based joints
                    currentPoseData.current = {
                        keypoints: internalPose.keypoints,
                        joints: jointsRef.current || {}
                    };

                    // Render
                    const ctx = internalCanvasRef.current?.getContext('2d');
                    if (ctx && internalCanvasRef.current) {
                        ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

                        if (showSkeletonRef.current) {
                            try {
                                // Check for essential joints with lower threshold for fast movement
                                // Check for essential joints
                                // For Side View: Allow if at least one side (Shoulder+Hip) is visible
                                const leftSide = ['left_shoulder', 'left_hip'].every(name => {
                                    const kp = internalPose.keypoints.find(k => k.name === name);
                                    return kp && (kp.score || 0) > 0.2;
                                });
                                const rightSide = ['right_shoulder', 'right_hip'].every(name => {
                                    const kp = internalPose.keypoints.find(k => k.name === name);
                                    return kp && (kp.score || 0) > 0.2;
                                });

                                const hasEssentials = leftSide || rightSide;

                                if (hasEssentials) {
                                    // Calculate distance status
                                    // We need to be careful with side view distance check.
                                    // Use the visible side's torso height.

                                    let torsoHeight = 0;
                                    const ls = internalPose.keypoints.find(k => k.name === 'left_shoulder');
                                    const lh = internalPose.keypoints.find(k => k.name === 'left_hip');
                                    const rs = internalPose.keypoints.find(k => k.name === 'right_shoulder');
                                    const rh = internalPose.keypoints.find(k => k.name === 'right_hip');

                                    if (leftSide && ls && lh) {
                                        torsoHeight = Math.abs(lh.y - ls.y);
                                    } else if (rightSide && rs && rh) {
                                        torsoHeight = Math.abs(rh.y - rs.y);
                                    }

                                    // Check ankles for "optimal" vs "too close"
                                    // Ideally we want to see feet.
                                    const la = internalPose.keypoints.find(k => k.name === 'left_ankle');
                                    const ra = internalPose.keypoints.find(k => k.name === 'right_ankle');
                                    const feetVisible = (la && (la.score || 0) > 0.2) || (ra && (ra.score || 0) > 0.2);

                                    // Relaxed thresholds
                                    if (torsoHeight > 550) {
                                        setDistanceStatus('too_close');
                                    } else if (torsoHeight < 80) {
                                        setDistanceStatus('too_far');
                                    } else if (feetVisible) {
                                        setDistanceStatus('optimal');
                                    } else {
                                        // Fallback logic
                                        if (torsoHeight > 300) {
                                            setDistanceStatus('too_close');
                                        } else {
                                            setDistanceStatus('unknown');
                                        }
                                    }

                                    // ONLY draw skeleton when in optimal position (or at least valid side view)
                                    // We'll draw if we have essentials, even if feet are cut off, to be more permissive.
                                    if (hasEssentials) {
                                        // Draw Guides First (Behind the skeleton)
                                        drawGolfGuides(ctx, internalPose.keypoints, 0.15, handPathRef.current);

                                        // Draw Skeleton & Keypoints
                                        drawSkeleton(ctx, internalPose.keypoints, 0.15);
                                        drawKeypoints(ctx, internalPose.keypoints, 0.15);

                                        // Draw Joint Angles
                                        drawJointAngles(ctx, internalPose.keypoints, jointsRef.current || {}, 0.15);

                                        // Draw Club Prediction
                                        const club = clubEstimator.current.estimate(internalPose.keypoints);
                                        if (club) {
                                            ctx.beginPath();
                                            ctx.moveTo(club.grip.x, club.grip.y);
                                            ctx.lineTo(club.head.x, club.head.y);
                                            ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
                                            ctx.lineWidth = 8;
                                            ctx.lineCap = 'round';
                                            ctx.stroke();

                                            ctx.beginPath();
                                            ctx.arc(club.head.x, club.head.y, 10, 0, 2 * Math.PI);
                                            ctx.fillStyle = '#facc15';
                                            ctx.fill();
                                            ctx.strokeStyle = 'black';
                                            ctx.lineWidth = 2;
                                            ctx.stroke();
                                        }

                                        // Draw IK Overlay
                                        if (ikRef.current) {
                                            drawIKOverlay(ctx, ikRef.current);
                                        }
                                    }
                                }
                            } catch (drawErr) {
                                console.error("Drawing Error:", drawErr);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Capture Loop Error:", err);
            }

            // FPS Update
            const currentFps = fpsCounter.current.tick(performance.now());
            onFPSUpdateRef.current(currentFps);

            if (isActive) requestRef.current = requestAnimationFrame(capture);
        };

        requestRef.current = requestAnimationFrame(capture);
        return () => {
            isActive = false;
            cancelAnimationFrame(requestRef.current);
        };
    }, [modelLoaded]);

    return (
        <div
            className="relative bg-black rounded-lg overflow-hidden shadow-xl"
            style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}
        >
            {/* Model Loading / Error Overlay */}
            {!modelLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-20 bg-black/80 flex-col p-4 text-center">
                    {error ? (
                        <>
                            <div className="text-red-500 font-bold mb-2">Model Error</div>
                            <div className="text-sm">{error}</div>
                        </>
                    ) : 'Loading Model...'}
                </div>
            )}

            {/* Low Light Warning Overlay */}
            {isLowLight && modelLoaded && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-full font-bold z-30 flex items-center gap-2 animate-bounce">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Low Light Detected</span>
                </div>
            )}

            {/* Distance Indicator */}
            {modelLoaded && distanceStatus !== 'unknown' && distanceStatus !== 'optimal' && (
                <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-bold z-30 flex items-center gap-2 ${distanceStatus === 'too_close' ? 'bg-red-500/90 text-white' : 'bg-blue-500/90 text-white'
                    }`}>
                    {distanceStatus === 'too_close' ? (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                            <span>Step Back - Too Close</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                            <span>Move Closer - Too Far</span>
                        </>
                    )}
                </div>
            )}

            {modelLoaded && distanceStatus === 'optimal' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-bold z-30 flex items-center gap-2 bg-green-500/90 text-black">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Optimal Distance</span>
                </div>
            )}

            {/* Phase Indicator */}
            {modelLoaded && phase && phase !== 'IDLE' && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                    <div className={`
                        px-6 py-2 rounded-full font-black text-xl tracking-widest uppercase shadow-lg backdrop-blur-md border border-white/20 transition-all duration-300
                        ${phase === 'Address' ? 'bg-blue-500/80 text-white scale-100' : ''}
                        ${phase === 'Backswing' ? 'bg-yellow-500/80 text-black scale-110' : ''}
                        ${phase === 'Downswing' ? 'bg-orange-500/80 text-white scale-110' : ''}
                        ${phase === 'Impact' ? 'bg-red-600/90 text-white scale-125 ring-4 ring-red-500/50' : ''}
                        ${phase === 'FollowThrough' || phase === 'Finish' ? 'bg-green-500/90 text-white scale-100' : ''}
                    `}>
                        {phase}
                    </div>
                    {phase === 'Address' && (
                        <div className="mt-2 text-xs font-bold text-blue-300 animate-pulse bg-black/50 px-2 py-1 rounded">
                            HOLD STILL TO START
                        </div>
                    )}
                </div>
            )}

            <Webcam
                ref={webcamRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
                mirrored={true}
                className="absolute top-0 left-0"
                videoConstraints={{
                    width: VIDEO_WIDTH,
                    height: VIDEO_HEIGHT,
                    facingMode: "user"
                }}
            />
            <canvas
                ref={internalCanvasRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
                className="absolute top-0 left-0 z-10 pointer-events-none"
                style={{ background: 'transparent' }}
            />
        </div>
    );
});
