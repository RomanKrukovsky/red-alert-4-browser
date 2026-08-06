import { describe, it, expect } from 'vitest';
import { AuthoritativeMatchRuntime } from '../matches/matchRuntime';
import { FactionId, PlayerType } from '@ra4/shared-types';

describe('Server Reconnect & Snapshot Recovery Suite', () => {
  it('should handle disconnect and restore state on valid reconnect token', () => {
    const runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
    ]);

    runtime.handleDisconnect(0);
    expect(runtime.players.get(0)?.isConnected).toBe(false);

    // Protocol v1: reconnect snapshot arrives as a binary SNAPSHOT_JSON envelope.
    let receivedKind = -1;
    const mockWs = {
      readyState: 1,
      send: (data: Uint8Array) => {
        receivedKind = data[3]; // WireKind byte in the envelope header
      },
    } as any;

    const ok = runtime.handleReconnect(0, 'token-0', 0, mockWs);
    expect(ok).toBe(true);
    expect(runtime.players.get(0)?.isConnected).toBe(true);
    expect(receivedKind).toBe(24); // WireKind.SNAPSHOT_JSON
  });

  it('should reject reconnect attempt with invalid token', () => {
    const runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
      { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
    ]);

    const mockWs = { readyState: 1, send: () => {} } as any;
    const ok = runtime.handleReconnect(0, 'INVALID_TOKEN_123', 0, mockWs);
    expect(ok).toBe(false);
  });
});
