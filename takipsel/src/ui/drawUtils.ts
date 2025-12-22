import type { Keypoint } from '../pose/types';

const CONNECTIONS = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
    // Hands
    ['left_wrist', 'left_thumb'], ['left_wrist', 'left_pinky'], ['left_wrist', 'left_index'],
    ['right_wrist', 'right_thumb'], ['right_wrist', 'right_pinky'], ['right_wrist', 'right_index'],
    // Feet
    ['left_ankle', 'left_heel'], ['left_ankle', 'left_foot_index'], ['left_heel', 'left_foot_index'],
    ['right_ankle', 'right_heel'], ['right_ankle', 'right_foot_index'], ['right_heel', 'right_foot_index']
];

const IGNORED_POINTS = new Set([
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right'
]);

export function drawKeypoints(ctx: CanvasRenderingContext2D, keypoints: Keypoint[], minConfidence: number) {
    keypoints.forEach((kp) => {
        const score = kp.score ?? 0;
        const isLowConfidence = score < minConfidence;

        // Draw low confidence points in red/less visible
        // Hide face points entirely to avoid chaos
        if (kp.name && !IGNORED_POINTS.has(kp.name)) {
            // Only ignore totally invalid points (score < 0.1)
            if (score < 0.1) return;

            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 3, 0, 2 * Math.PI);

            if (isLowConfidence) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red-500 low opacity
                ctx.shadowBlur = 0;
            } else {
                // Color coding
                if (kp.name.includes('left')) {
                    ctx.fillStyle = '#d946ef'; // Fuchsia/Magenta for left
                } else if (kp.name.includes('right')) {
                    ctx.fillStyle = '#06b6d4'; // Cyan for right
                } else if (kp.name === 'nose') {
                    ctx.fillStyle = '#ffffff'; // White for nose
                } else {
                    ctx.fillStyle = '#00ff00'; // Default
                }

                // Highlight hands and feet
                if (kp.name.includes('wrist') || kp.name.includes('pinky') || kp.name.includes('index') || kp.name.includes('thumb') || kp.name.includes('ankle') || kp.name.includes('heel') || kp.name.includes('foot')) {
                    ctx.fillStyle = '#39ff14'; // Neon Green
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#39ff14';
                } else {
                    ctx.shadowBlur = 0;
                }
            }

            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow
        }
    });
}

export function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Keypoint[], minConfidence: number) {
    const kpMap = new Map<string, Keypoint>();
    keypoints.forEach(kp => {
        if (kp.name) kpMap.set(kp.name, kp);
    });

    ctx.lineWidth = 2;

    CONNECTIONS.forEach(([p1, p2]) => {
        const a = kpMap.get(p1);
        const b = kpMap.get(p2);

        // Strict Check: both points must exist and meet minConfidence
        if (a && b && (a.score ?? 0) >= minConfidence && (b.score ?? 0) >= minConfidence) {

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            // Gradient stroke based on side
            const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);

            const getColor = (name: string) => {
                if (name.includes('left')) return '#d946ef';
                if (name.includes('right')) return '#06b6d4';
                return '#ffffff';
            };

            gradient.addColorStop(0, getColor(p1));
            gradient.addColorStop(1, getColor(p2));
            ctx.strokeStyle = gradient;

            ctx.stroke();
        }
    });
}

export function drawGolfGuides(ctx: CanvasRenderingContext2D, keypoints: Keypoint[], minConfidence: number, handPath?: { x: number; y: number }[]) {
    const kpMap = new Map<string, Keypoint>();
    keypoints.forEach(kp => {
        if (kp.name) kpMap.set(kp.name, kp);
    });

    const getKp = (name: string) => {
        const kp = kpMap.get(name);
        return (kp && (kp.score ?? 0) >= minConfidence) ? kp : null;
    };

    const leftShoulder = getKp('left_shoulder');
    const rightShoulder = getKp('right_shoulder');
    const leftHip = getKp('left_hip');
    const rightHip = getKp('right_hip');

    ctx.lineWidth = 3;

    // Shoulder Plane Line (Cyan)
    if (leftShoulder && rightShoulder) {
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x, leftShoulder.y);
        ctx.lineTo(rightShoulder.x, rightShoulder.y);
        ctx.strokeStyle = '#22d3ee'; // Cyan
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Hip Plane Line (Magenta)
    if (leftHip && rightHip) {
        ctx.beginPath();
        ctx.moveTo(leftHip.x, leftHip.y);
        ctx.lineTo(rightHip.x, rightHip.y);
        ctx.strokeStyle = '#d946ef'; // Magenta
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Spine Line (White, Mid-Hip to Mid-Shoulder)
    if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
        const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const midHipX = (leftHip.x + rightHip.x) / 2;
        const midHipY = (leftHip.y + rightHip.y) / 2;

        ctx.beginPath();
        ctx.moveTo(midHipX, midHipY);
        ctx.lineTo(midShoulderX, midShoulderY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw center points
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(midHipX, midHipY, 5, 0, 2 * Math.PI);
        ctx.arc(midShoulderX, midShoulderY, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    // Draw Hand Path (Swing Trail) - "Shot Tracer" Style (Comet)
    if (handPath && handPath.length > 2) {
        const recentPath = handPath.slice(-30);

        // 1. Glow Effect (Outer Blur) - Red/Orange
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444'; // Red-500 glow

        ctx.beginPath();
        // Use curves for smooth path
        if (recentPath.length > 1) {
            ctx.moveTo(recentPath[0].x, recentPath[0].y);
            for (let i = 1; i < recentPath.length - 1; i++) {
                const cx = (recentPath[i].x + recentPath[i + 1].x) / 2;
                const cy = (recentPath[i].y + recentPath[i + 1].y) / 2;
                ctx.quadraticCurveTo(recentPath[i].x, recentPath[i].y, cx, cy);
            }
            // Connect last segment
            const last = recentPath[recentPath.length - 1];
            const secondLast = recentPath[recentPath.length - 2];
            ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
        }

        // Gradient for the stroke itself: Transparent -> White -> Red
        if (recentPath.length > 1) {
            const firstPt = recentPath[0];
            const lastPt = recentPath[recentPath.length - 1];
            const gradient = ctx.createLinearGradient(firstPt.x, firstPt.y, lastPt.x, lastPt.y);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)'); // Start transparent
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)'); // Mid whiteish
            gradient.addColorStop(1, '#ef4444'); // End Red

            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = '#ef4444';
        }

        ctx.lineWidth = 4; // Thin, professional line
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();

        // 2. Comet Head (Glowing Ball)
        const head = recentPath[recentPath.length - 1];

        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffffff'; // White glow for head

        ctx.beginPath();
        ctx.arc(head.x, head.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff'; // White core
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ef4444'; // Red rim
        ctx.stroke();
        ctx.restore();
    }
}

export function drawIKOverlay(ctx: CanvasRenderingContext2D, ik: import('../pose/types').IKResult) {
    if (!ik) return;

    // Draw IK Solution (Dashed Line)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e879f9'; // Fuchsia for IK

    // Shoulder to Elbow
    ctx.moveTo(ik.shoulder.x, ik.shoulder.y);
    ctx.lineTo(ik.elbow.x, ik.elbow.y);

    // Elbow to Wrist
    ctx.lineTo(ik.wrist.x, ik.wrist.y);

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw IK Joints
    const drawPoint = (p: { x: number, y: number }, color: string) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    };

    drawPoint(ik.elbow, '#e879f9');
    drawPoint(ik.wrist, '#e879f9');
}

export function drawJointAngles(
    ctx: CanvasRenderingContext2D,
    keypoints: Keypoint[],
    joints: Record<string, import('../pose/types').JointMetric>,
    minConfidence: number
) {
    if (!joints || Object.keys(joints).length === 0) return;

    const kpMap = new Map<string, Keypoint>();
    keypoints.forEach(kp => {
        if (kp.name) kpMap.set(kp.name, kp);
    });

    // Joint definitions - map joint name to the middle keypoint (the actual joint)
    const jointMappings: Record<string, string> = {
        'Right Elbow': 'right_elbow',
        'Left Elbow': 'left_elbow',
        'Right Knee': 'right_knee',
        'Left Knee': 'left_knee',
        'Right Shoulder': 'right_shoulder',
        'Left Shoulder': 'left_shoulder',
    };

    // Drawing settings
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    Object.entries(joints).forEach(([jointName, metric]) => {
        const keypointName = jointMappings[jointName];
        if (!keypointName) return;

        const kp = kpMap.get(keypointName);
        if (!kp || (kp.score ?? 0) < minConfidence) return;

        const angle = Math.round(metric.angle);
        const text = `${angle}°`;

        // Position offset to avoid overlap with keypoint
        const offsetX = jointName.includes('Right') ? 35 : -35;
        const offsetY = -10;
        const x = kp.x + offsetX;
        const y = kp.y + offsetY;

        // Measure text for background
        const textMetrics = ctx.measureText(text);
        const padding = 6;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 24;

        // Draw background with border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Green border
        ctx.lineWidth = 2;

        const radius = 6;
        ctx.beginPath();
        ctx.roundRect(
            x - bgWidth / 2,
            y - bgHeight / 2,
            bgWidth,
            bgHeight,
            radius
        );
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#10b981'; // Green text
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 4;
        ctx.fillText(text, x, y); // Centered at x, y
        ctx.shadowBlur = 0;

        // Draw connecting line separately (in global space, so it connects correctly)
        // If we draw line inside the flip, it might detach from the joint visually if we are not careful about "joint position" vs "label position".
        // Joint 'kp' is at (kp.x, kp.y). Label is at (x, y). 
        // Line goes from (x, y) to (kp.x, kp.y).
        // Since (x,y) is start, and we are mirrored globally...
        // Let's keep line outside the local flip to avoid headache.
        // But wait, the background box was drawn flipped. 
        // Its center is (x,y). Line starts at (x, y + bgHeight/2)?
        // Previous logic: ctx.moveTo(x, y + bgHeight / 2); lineTo(kp.x, kp.y);
        // This is fine to keep outside.
        ctx.beginPath();
        ctx.moveTo(x, y + bgHeight / 2);
        ctx.lineTo(kp.x, kp.y);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
    });
}
