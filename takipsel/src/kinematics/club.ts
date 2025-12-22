import type { Keypoint } from '../pose/types';

export interface ClubState {
    head: { x: number, y: number };
    grip: { x: number, y: number };
    angle: number; // degrees approx
}

export class ClubEstimator {
    // Since MoveNet doesn't have finger keypoints, we estimate club direction
    // from the forearm direction (elbow -> wrist vector).
    // The club extends as a continuation of the arm.

    estimate(keypoints: Keypoint[]): ClubState | null {
        const kpMap = new Map<string, Keypoint>();
        keypoints.forEach(kp => kpMap.set(kp.name!, kp));

        const lWrist = kpMap.get('left_wrist');
        const rWrist = kpMap.get('right_wrist');
        const lElbow = kpMap.get('left_elbow');
        const rElbow = kpMap.get('right_elbow');

        // Need wrists and elbows to determine forearm direction
        if (!lWrist || !rWrist || !lElbow || !rElbow) return null;
        if ((lWrist.score || 0) < 0.4 || (rWrist.score || 0) < 0.4) return null;
        if ((lElbow.score || 0) < 0.4 || (rElbow.score || 0) < 0.4) return null;

        // Grip Position (Midpoint of Wrists)
        const gripX = (lWrist.x + rWrist.x) / 2;
        const gripY = (lWrist.y + rWrist.y) / 2;

        // Direction Vector from Elbow to Wrist (forearm direction)
        // Left forearm vector
        const lVecX = lWrist.x - lElbow.x;
        const lVecY = lWrist.y - lElbow.y;

        // Right forearm vector
        const rVecX = rWrist.x - rElbow.x;
        const rVecY = rWrist.y - rElbow.y;

        // Combined direction (average the two forearm vectors)
        let dirX = (lVecX + rVecX) / 2;
        let dirY = (lVecY + rVecY) / 2;

        // Normalize
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len < 10) return null; // Too small to determine

        dirX /= len;
        dirY /= len;

        // Club length estimation:
        // Average forearm length as a reference
        const forearmLen = (Math.sqrt(lVecX * lVecX + lVecY * lVecY) + Math.sqrt(rVecX * rVecX + rVecY * rVecY)) / 2;
        // Club is approximately 2.5x forearm length for a driver
        const CLUB_LENGTH_PX = forearmLen * 2.5;

        const headX = gripX + dirX * CLUB_LENGTH_PX;
        const headY = gripY + dirY * CLUB_LENGTH_PX;

        const angle = Math.atan2(dirY, dirX) * 180 / Math.PI;

        return {
            grip: { x: gripX, y: gripY },
            head: { x: headX, y: headY },
            angle
        };
    }
}
