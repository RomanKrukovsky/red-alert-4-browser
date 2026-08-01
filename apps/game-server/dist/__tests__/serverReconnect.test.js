"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const matchRuntime_1 = require("../matches/matchRuntime");
const shared_types_1 = require("@ra4/shared-types");
(0, vitest_1.describe)('Server Reconnect & Snapshot Recovery Suite', () => {
    (0, vitest_1.it)('should handle disconnect and restore state on valid reconnect token', () => {
        const runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        runtime.handleDisconnect(0);
        (0, vitest_1.expect)(runtime.players.get(0)?.isConnected).toBe(false);
        const mockWs = {
            readyState: 1,
            send: (data) => {
                const msg = JSON.parse(data);
                (0, vitest_1.expect)(msg.type).toEqual('STATE_SNAPSHOT');
            },
        };
        const ok = runtime.handleReconnect(0, 'token-0', 0, mockWs);
        (0, vitest_1.expect)(ok).toBe(true);
        (0, vitest_1.expect)(runtime.players.get(0)?.isConnected).toBe(true);
    });
    (0, vitest_1.it)('should reject reconnect attempt with invalid token', () => {
        const runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        const mockWs = { readyState: 1, send: () => { } };
        const ok = runtime.handleReconnect(0, 'INVALID_TOKEN_123', 0, mockWs);
        (0, vitest_1.expect)(ok).toBe(false);
    });
});
//# sourceMappingURL=serverReconnect.test.js.map