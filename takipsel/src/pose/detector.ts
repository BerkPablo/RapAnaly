import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
// Register WebGL backend
import '@tensorflow/tfjs-backend-webgl';

let detector: poseDetection.PoseDetector | null = null;

export async function initDetector() {
    if (detector) return detector;

    await tf.ready();
    // Ensure WebGL is used for performance
    await tf.setBackend('webgl');

    const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'full'
    } as poseDetection.BlazePoseTfjsModelConfig;

    detector = await poseDetection.createDetector(model, detectorConfig);
    console.log('BlazePose Detector Initialized (TFJS Runtime)');
    return detector;
}

const BLAZEPOSE_KEYPOINT_NAMES = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
    'left_pinky', 'right_pinky', 'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
    'left_heel', 'right_heel', 'left_foot_index', 'right_foot_index'
];

export async function detectPose(video: HTMLVideoElement) {
    if (!detector) throw new Error('Detector not initialized');

    try {
        const poses = await detector.estimatePoses(video, {
            maxPoses: 1,
            flipHorizontal: false // We flip usually via CSS or Canvas context
        });

        if (poses.length > 0) {
            const pose = poses[0];
            // Normalize keypoints
            pose.keypoints = pose.keypoints.map((kp, index) => ({
                ...kp,
                name: kp.name || BLAZEPOSE_KEYPOINT_NAMES[index]
            }));
            return pose;
        }
        return null;
    } catch (error) {
        console.error('Pose detection error:', error);
        return null;
    }
}
