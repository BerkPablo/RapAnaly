import { type Point, distance } from './geometry';

/**
 * Solves 2-bone Inverse Kinematics (Law of Cosines).
 * Given lengths L1 (Upper), L2 (Lower), and target distance from root.
 * Returns angles in radians for the base joint (shoulder/hip) and hinge joint (elbow/knee).
 */
export function solve2BoneIK(
    l1: number,
    l2: number,
    targetDist: number
): { alpha: number; beta: number } | null {
    // Clamp target distance to reachable range
    const dist = Math.min(Math.max(targetDist, Math.abs(l1 - l2)), l1 + l2);

    // Law of Cosines
    // c^2 = a^2 + b^2 - 2ab cos(C)
    // angle opposite to target dist (hinge angle supplement)
    const cosBeta = (l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2);
    // angle at base relative to target vector
    const cosAlpha = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);

    if (isNaN(cosBeta) || isNaN(cosAlpha)) return null;

    const beta = Math.acos(cosBeta); // Interior angle at hinge
    const alpha = Math.acos(cosAlpha); // Angle offset from target vector

    // Return elbow flexion (Pi - interior angle) and shoulder offset
    return { alpha, beta };
}

/**
 * Computes the IK pose for a 2-bone chain.
 * @param root Start position (e.g. Shoulder)
 * @param target End effector target (e.g. Wrist)
 * @param l1 Length of first bone (e.g. Humerus)
 * @param l2 Length of second bone (e.g. Radius)
 * @param bendDir Direction of bend (1 or -1) to choose solution
 */
export function computeIKChain(
    root: Point,
    target: Point,
    l1: number,
    l2: number,
    bendDir: number = 1
): { joint: Point; end: Point } {
    const d = distance(root, target);
    const angles = solve2BoneIK(l1, l2, d);

    if (!angles) {
        // Should not happen due to clamping, but fallback to straight line
        return { joint: root, end: target };
    }

    // Angle of vector from root to target
    const baseAngle = Math.atan2(target.y - root.y, target.x - root.x);

    // Calculated joint angle
    // alpha is the angle between the root-target vector and the first bone
    const theta1 = baseAngle - (bendDir * angles.alpha);

    // Position of middle joint (elbow/knee)
    const jointX = root.x + l1 * Math.cos(theta1);
    const jointY = root.y + l1 * Math.sin(theta1);
    const joint: Point = { x: jointX, y: jointY };

    // Calculate forward kinematics to ensure end effector is correct (clamped)
    // Theta2 is absolute angle of second bone
    // beta is interior angle. Exterior deflection is (PI - beta)
    // But easier to just use the triangle geometry again or project from joint to target?
    // If we clamped, we might not reach target. So we recompute end pos based on angles.

    // Angle of bone 2 relative to bone 1:
    // The interior angle is beta. 
    // So absolute angle theta2 = theta1 + bendDir * (PI - beta) ? 
    // Let's verify law of cosines angle definitions.
    // beta from solve2BoneIK is the angle OPPOSITE the target-root line. 
    // Actually, standard LC: c^2 = a^2 + b^2 - 2ab cos(Gamma). Gamma is angle between a and b.
    // In `solve2BoneIK`, beta is `acos((l1^2 + l2^2 - dist^2) / (2*l1*l2))`.
    // This is the angle BETWEEN l1 and l2 (the interior elbow angle).

    // So deviation from straight line is (PI - beta).

    const theta2 = theta1 + bendDir * (Math.PI - angles.beta);

    const endX = jointX + l2 * Math.cos(theta2);
    const endY = jointY + l2 * Math.sin(theta2);

    return { joint, end: { x: endX, y: endY } };
}
