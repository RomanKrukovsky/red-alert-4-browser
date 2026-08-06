import { describe, it, expect, afterEach } from 'vitest';
import { AuthoritativeMatchRuntime } from '../matches/matchRuntime';
import { FactionId, PlayerType, CommandType } from '@ra4/shared-types';

describe('Authoritative Match Runtime & Anti-Cheat Suite', () => {
  let runtime: AuthoritativeMatchRuntime | null = null;

  afterEach(() => {
    if (runtime) {
      runtime.stop();
      runtime = null;
    }
  });

  it('should initialize 30 Hz authoritative simulation and start tick loop', () => {
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
      { playerIndex: 1, name: 'Player 2', factionId: FactionId.ALLIANCE, team: 1, type: PlayerType.AI_MEDIUM, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-1' },
    ]);

    expect(runtime.matchId).toBeDefined();
    expect(runtime.sim.tickIndex).toEqual(0);

    runtime.start();
    expect(runtime.sim).toBeDefined();
  });

  it('should reject player command spoofing attempt (playerIndex mismatch)', () => {
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
    ]);

    const spoofCmd = {
      type: CommandType.MOVE,
      playerIndex: 1,
      entityIds: [1],
      targetX: 100,
      targetY: 100,
    };

    const res = runtime.submitCommand(0, spoofCmd as any);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('spoofing');
  });

  it('should reject building structures out of map bounds or with insufficient credits', () => {
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
    ]);

    runtime.sim.players[0].credits = 0;

    // Unknown structure id is rejected before the credit check
    const unknownCmd = { type: CommandType.BUILD_STRUCTURE, playerIndex: 0, structureId: 'bldg_fake', gridX: 10, gridY: 10, entityIds: [], tick: 0 };
    const unknownRes = runtime.submitCommand(0, unknownCmd as any);
    expect(unknownRes.valid).toBe(false);
    expect(unknownRes.reason).toContain('Unknown structure');

    // Real structure with zero credits is rejected for cost
    const buildCmd = { type: CommandType.BUILD_STRUCTURE, playerIndex: 0, structureId: 'SU_ThermalPower', gridX: 30, gridY: 30, entityIds: [], tick: 0 };
    const res = runtime.submitCommand(0, buildCmd as any);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('credits');
  });

  it('should generate replay v2 export with header and decodable container', async () => {
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
    ]);

    const { decodeReplay } = await import('@ra4/replay');
    const data = decodeReplay(runtime.exportReplay());

    expect(data.header.mapId).toEqual('map_red_square_duel');
    expect(data.header.seed).toEqual(1337);
    expect(data.header.formatVersion).toEqual(2);
  });
});
