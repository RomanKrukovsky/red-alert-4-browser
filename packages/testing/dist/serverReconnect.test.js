import { describe, it, expect } from 'vitest';
import { AuthoritativeMatchRuntime } from '../../../apps/game-server/src/matches/matchRuntime.js';
import { FactionId, PlayerType } from '@ra4/shared-types';
describe('Server Reconnect & Snapshot Recovery Suite', () => {
    it('should handle disconnect and restore state on valid reconnect token', () => {
        const runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        // Handle disconnect
        runtime.handleDisconnect(0);
        expect(runtime.players.get(0)?.isConnected).toBe(false);
        // Mock WebSocket connection object
        const mockWs = {
            readyState: 1,
            send: (data) => {
                const msg = JSON.parse(data);
                expect(msg.type).toEqual('STATE_SNAPSHOT');
            },
        };
        const ok = runtime.handleReconnect(0, 'token-0', 0, mockWs);
        expect(ok).toBe(true);
        expect(runtime.players.get(0)?.isConnected).toBe(true);
    });
    it('should reject reconnect attempt with invalid token', () => {
        const runtime = new AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: FactionId.USSR, team: 0, type: PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        const mockWs = { readyState: 1, send: () => { } };
        const ok = runtime.handleReconnect(0, 'INVALID_TOKEN_123', 0, mockWs);
        expect(ok).toBe(false);
    });
});
//# sourceMappingURL=serverReconnect.test.js.map