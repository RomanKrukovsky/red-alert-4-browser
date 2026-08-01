import { describe, expect, it } from 'vitest';
import { computeMoveDelta } from './camera.js';

describe('computeMoveDelta', () => {
  const speed = 1;

  it('returns zero delta when no keys are pressed', () => {
    expect(computeMoveDelta(new Set(), speed)).toEqual({ x: 0, z: 0 });
  });

  // W/S ─ forward / backward along world Z
  it('W moves in +Z (forward)', () => {
    expect(computeMoveDelta(new Set(['w']), speed)).toEqual({ x: 0, z: speed });
  });
  it('S moves in -Z (backward)', () => {
    expect(computeMoveDelta(new Set(['s']), speed)).toEqual({ x: 0, z: -speed });
  });

  // A/D ─ camera at alpha=-PI/4 means +X = screen-left, -X = screen-right
  it('A (screen-left) increases world X', () => {
    const { x, z } = computeMoveDelta(new Set(['a']), speed);
    expect(x).toBeGreaterThan(0);
    expect(z).toBe(0);
  });
  it('D (screen-right) decreases world X', () => {
    const { x, z } = computeMoveDelta(new Set(['d']), speed);
    expect(x).toBeLessThan(0);
    expect(z).toBe(0);
  });

  // Arrow key aliases mirror A/D/W/S
  it('ArrowLeft behaves like A', () => {
    expect(computeMoveDelta(new Set(['arrowleft']), speed)).toEqual(
      computeMoveDelta(new Set(['a']), speed)
    );
  });
  it('ArrowRight behaves like D', () => {
    expect(computeMoveDelta(new Set(['arrowright']), speed)).toEqual(
      computeMoveDelta(new Set(['d']), speed)
    );
  });

  // Edge-pan aliases
  it('edge_left behaves like A', () => {
    expect(computeMoveDelta(new Set(['edge_left']), speed)).toEqual(
      computeMoveDelta(new Set(['a']), speed)
    );
  });
  it('edge_right behaves like D', () => {
    expect(computeMoveDelta(new Set(['edge_right']), speed)).toEqual(
      computeMoveDelta(new Set(['d']), speed)
    );
  });

  // Shift doubles speed
  it('shift doubles the speed', () => {
    const normal = computeMoveDelta(new Set(['w']), speed);
    const shifted = computeMoveDelta(new Set(['w', 'shift']), speed);
    expect(shifted.z).toBe(normal.z * 2);
  });

  // Diagonal: A+W
  it('A+W produces positive X and positive Z', () => {
    const { x, z } = computeMoveDelta(new Set(['a', 'w']), speed);
    expect(x).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(0);
  });
});
