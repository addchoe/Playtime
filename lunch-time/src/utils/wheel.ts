/**
 * Shared wheel geometry — used by both the wheel's label layout and the
 * page's spin-rotation math, so the two never drift out of alignment.
 */

/** Screen-space angle convention: 0deg = +x (right), 90deg = +y (down). */
export const POINTER_ANGLE_DEG = 90;

export function segmentCenterAngleDeg(index: number, total: number): number {
  const step = 360 / total;
  return -90 + step / 2 + index * step;
}

/** Normalizes a delta angle into [0, 360). */
export function normalizeAngle(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Rotation (in degrees, added on top of the wheel's current rotation) needed
 * so that the segment at `winnerIndex` ends up under the fixed pointer,
 * after a few extra full spins for visual effect.
 */
export function computeSpinDelta(winnerIndex: number, total: number, extraSpins = 6): number {
  const targetAngle = segmentCenterAngleDeg(winnerIndex, total);
  const delta = normalizeAngle(POINTER_ANGLE_DEG - targetAngle);
  return delta + 360 * extraSpins;
}
