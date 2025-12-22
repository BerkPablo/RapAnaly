import type { Keypoint, JointMetric } from '../pose/types';
import { drawKeypoints, drawSkeleton, drawJointAngles } from '../ui/drawUtils';

export class CompositeVideoRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private compositeCanvas: HTMLCanvasElement | null = null;
    private overlayCanvas: HTMLCanvasElement | null = null;
    private animationFrame: number = 0;
    private videoElement: HTMLVideoElement;
    private getJointData: () => { keypoints: Keypoint[], joints: Record<string, JointMetric> };

    constructor(
        videoElement: HTMLVideoElement,
        getJointData: () => { keypoints: Keypoint[], joints: Record<string, JointMetric> }
    ) {
        this.videoElement = videoElement;
        this.getJointData = getJointData;
    }

    start() {
        const width = this.videoElement.videoWidth || 960;
        const height = this.videoElement.videoHeight || 720;

        // Create composite canvas
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCanvas.width = width;
        this.compositeCanvas.height = height;

        // Create overlay canvas for joint angles and skeleton
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;

        const compositeCtx = this.compositeCanvas.getContext('2d', { alpha: false });
        const overlayCtx = this.overlayCanvas.getContext('2d');

        if (!compositeCtx || !overlayCtx) {
            throw new Error('Failed to get canvas contexts');
        }

        // Initialize with a black frame
        compositeCtx.fillStyle = 'black';
        compositeCtx.fillRect(0, 0, width, height);

        this.stream = this.compositeCanvas.captureStream(30);

        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];

        let selectedMimeType = '';
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                selectedMimeType = mimeType;
                break;
            }
        }

        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: selectedMimeType
        });

        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        let frameCount = 0;
        const drawFrame = () => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                return;
            }

            // Draw webcam video (mirrored)
            compositeCtx.save();
            compositeCtx.translate(width, 0);
            compositeCtx.scale(-1, 1);
            compositeCtx.drawImage(this.videoElement, 0, 0, width, height);
            compositeCtx.restore();

            // Get current joint data
            const { keypoints, joints } = this.getJointData();

            // Clear overlay canvas
            overlayCtx.clearRect(0, 0, width, height);

            // Draw skeleton & keypoints & joint angles on the overlay canvas
            // Keypoints are already mirrored from CameraCanvas, so we draw them directly
            if (keypoints.length > 0) {
                drawSkeleton(overlayCtx, keypoints, 0.3);
                drawKeypoints(overlayCtx, keypoints, 0.3);
                drawJointAngles(overlayCtx, keypoints, joints, 0.3);
            }

            // Composite overlay onto video
            compositeCtx.drawImage(this.overlayCanvas!, 0, 0);

            if (frameCount % 60 === 0) {
                console.log(`Recording frame ${frameCount}, joints: ${Object.keys(joints).length}`);
            }
            frameCount++;

            this.animationFrame = requestAnimationFrame(drawFrame);
        };

        this.mediaRecorder.start(100);
        drawFrame();
        console.log("Composite recording started");
    }

    stop(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                return reject("Recorder not initialized");
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                console.log("Composite recording stopped, blob size:", blob.size);

                // Cleanup
                cancelAnimationFrame(this.animationFrame);
                this.stream?.getTracks().forEach(track => track.stop());
                this.compositeCanvas = null;
                this.overlayCanvas = null;

                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    isRecording() {
        return this.mediaRecorder?.state === 'recording';
    }
}

