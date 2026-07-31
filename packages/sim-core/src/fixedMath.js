export const SCALE_FACTOR = 1000;
export function floatToFixed(v) {
    return Math.round(v * SCALE_FACTOR);
}
export function fixedToFloat(v) {
    return v / SCALE_FACTOR;
}
export function fixedDistanceSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}
export function fixedDistance(x1, y1, x2, y2) {
    return Math.round(Math.sqrt(fixedDistanceSq(x1, y1, x2, y2)));
}
export function fixedClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
export function fixedLerp(start, end, t) {
    return Math.round(start + (end - start) * t);
}
//# sourceMappingURL=fixedMath.js.map