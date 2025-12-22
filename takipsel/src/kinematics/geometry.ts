
export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

/**
 * Calculates the Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculates the angle at point B (A-B-C) in degrees.
 * Returns value in range [0, 180].
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

/**
 * Exponential Moving Average (EMA) smoothing.
 * @param current Current raw value
 * @param previous Previous smoothed value
 * @param alpha Smoothing factor [0, 1]. Lower = smoother but more lag.
 */
export function ema(current: number, previous: number | undefined, alpha: number): number {
  if (previous === undefined) return current;
  return alpha * current + (1 - alpha) * previous;
}
