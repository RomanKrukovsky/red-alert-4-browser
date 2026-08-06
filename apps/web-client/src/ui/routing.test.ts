import { describe, expect, it } from 'vitest';
import { FactionId } from '@ra4/shared-types';
import { factionByHash, resolveScreen } from './routing.js';
import { factionThemeById } from './types.js';

describe('UI routing and themes', () => {
  it('открывает ключевые экраны по стабильным маршрутам', () => {
    expect(resolveScreen('#/splash')).toBe('SPLASH');
    expect(resolveScreen('#/skirmish')).toBe('SKIRMISH_SETUP');
    expect(resolveScreen('#/campaign/chronolegion')).toBe('FACTION_CAMPAIGN');
    expect(resolveScreen('#/transmission')).toBe('TRANSMISSION');
    expect(resolveScreen('#/victory')).toBe('VICTORY');
    expect(resolveScreen('#/defeat')).toBe('DEFEAT');
    expect(resolveScreen('#/hud/soviet')).toBe('MATCH');
    expect(resolveScreen('#/multiplayer')).toBe('MULTIPLAYER_CONNECT');
    expect(resolveScreen('#/multiplayer/lobby')).toBe('MULTIPLAYER_LOBBY');
    expect(resolveScreen('#/unknown')).toBe('SPLASH');
  });

  it('сопоставляет все игровые фракции с разными темами', () => {
    expect(factionThemeById[FactionId.USSR]).toBe('soviet');
    expect(factionThemeById[FactionId.ALLIANCE]).toBe('allies');
    expect(factionThemeById[FactionId.ORIENTAL_COALITION]).toBe('coalition');
    expect(factionThemeById[FactionId.CHRONOLEGION]).toBe('chronolegion');
    expect(factionByHash['#/hud/allies']).toBe(FactionId.ALLIANCE);
  });
});
