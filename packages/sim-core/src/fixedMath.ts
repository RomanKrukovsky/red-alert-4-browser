export const SCALE_FACTOR = 1000;

export function floatToFixed(v: number): number {
  return Math.round(v * SCALE_FACTOR);
}

export function fixedToFloat(v: number): number {
  return v / SCALE_FACTOR;
}

export function fixedDistanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function fixedDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.round(Math.sqrt(fixedDistanceSq(x1, y1, x2, y2)));
}

export function fixedClamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function fixedLerp(start: number, end: number, t: number): number {
  return Math.round(start + (end - start) * t);
}
