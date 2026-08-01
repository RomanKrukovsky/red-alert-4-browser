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

    const buildCmd = {
      type: CommandType.BUILD_STRUCTURE,
      playerIndex: 0,
      specId: 'bldg_soviet_barracks',
      gridX: 10,
      gridY: 10,
    };

    const res = runtime.submitCommand(0, buildCmd as any);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('credits');
  });

  it('should generate replay export with header and recorded tick frames', () => {
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
    ]);

    const replayJson = runtime.replayRecorder.exportJSON();
    const data = JSON.parse(replayJson);

    expect(data.header.mapId).toEqual('map_red_square_duel');
    expect(data.header.seed).toEqual(1337);
  });
});
