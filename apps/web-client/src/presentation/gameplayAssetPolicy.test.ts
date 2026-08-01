import { describe, expect, it } from 'vitest';
import { findNearestShooter, getGameplayAssetProfile, normalizeCargo, resolveAnimation, SUPPORTED_GAMEPLAY_ASSET_IDS } from './gameplayAssetPolicy.js';

describe('gameplay asset policy', () => {
  it('resolves exactly the five approved gameplay assets', () => {
    expect(SUPPORTED_GAMEPLAY_ASSET_IDS).toEqual([
      'SU_GranitMBT',
      'SU_BogatyrOreCarrier',
      'SU_RubezhRifleman',
      'SU_HeavyFactory',
      'SU_Pillbox',
    ]);
    for (const id of SUPPORTED_GAMEPLAY_ASSET_IDS) expect(getGameplayAssetProfile(id)?.id).toBe(id);
    expect(getGameplayAssetProfile('AL_BulwarkMBT')).toBeUndefined();
  });

  it('selects fire, movement, and idle animations with declared fallbacks', () => {
    const profile = getGameplayAssetProfile('SU_RubezhRifleman')!;
    expect(resolveAnimation(profile, false, true, new Set(['Idle_Gun_Shoot']))).toBe('Idle_Gun_Shoot');
    expect(resolveAnimation(profile, true, false, new Set(['Walk']))).toBe('Walk');
    expect(resolveAnimation(profile, false, false, new Set(['Idle']))).toBe('Idle');
    expect(resolveAnimation(profile, true, false, new Set())).toBeUndefined();
  });

  it('associates a shot only with the nearest supported combat entity', () => {
    const entities = [
      { id: 1, specId: 'SU_GranitMBT', position: { x: 10_000, y: 10_000 } },
      { id: 2, specId: 'SU_RubezhRifleman', position: { x: 11_000, y: 10_000 } },
      { id: 3, specId: 'SU_BogatyrOreCarrier', position: { x: 10_050, y: 10_000 } },
      { id: 4, specId: 'AL_BulwarkMBT', position: { x: 10_020, y: 10_000 } },
    ];
    const shot = { startX: 10_900, startY: 10_000, targetX: 20_000, targetY: 10_000 };
    expect(findNearestShooter(entities, shot, 2.5)?.id).toBe(2);
    expect(findNearestShooter(entities, { ...shot, startX: 30_000 }, 2.5)).toBeUndefined();
  });

  it('normalizes cargo safely', () => {
    expect(normalizeCargo(50, 100)).toBe(.5);
    expect(normalizeCargo(150, 100)).toBe(1);
    expect(normalizeCargo(-20, 100)).toBe(0);
    expect(normalizeCargo(20, 0)).toBe(0);
  });
});
