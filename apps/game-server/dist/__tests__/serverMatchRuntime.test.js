"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const matchRuntime_1 = require("../matches/matchRuntime");
const shared_types_1 = require("@ra4/shared-types");
(0, vitest_1.describe)('Authoritative Match Runtime & Anti-Cheat Suite', () => {
    let runtime = null;
    (0, vitest_1.afterEach)(() => {
        if (runtime) {
            runtime.stop();
            runtime = null;
        }
    });
    (0, vitest_1.it)('should initialize 30 Hz authoritative simulation and start tick loop', () => {
        runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
            { playerIndex: 1, name: 'Player 2', factionId: shared_types_1.FactionId.ALLIANCE, team: 1, type: shared_types_1.PlayerType.AI_MEDIUM, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-1' },
        ]);
        (0, vitest_1.expect)(runtime.matchId).toBeDefined();
        (0, vitest_1.expect)(runtime.sim.tickIndex).toEqual(0);
        runtime.start();
        (0, vitest_1.expect)(runtime.sim).toBeDefined();
    });
    (0, vitest_1.it)('should reject player command spoofing attempt (playerIndex mismatch)', () => {
        runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        const spoofCmd = {
            type: shared_types_1.CommandType.MOVE,
            playerIndex: 1,
            entityIds: [1],
            targetX: 100,
            targetY: 100,
        };
        const res = runtime.submitCommand(0, spoofCmd);
        (0, vitest_1.expect)(res.valid).toBe(false);
        (0, vitest_1.expect)(res.reason).toContain('spoofing');
    });
    (0, vitest_1.it)('should reject building structures out of map bounds or with insufficient credits', () => {
        runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        runtime.sim.players[0].credits = 0;
        const buildCmd = {
            type: shared_types_1.CommandType.BUILD_STRUCTURE,
            playerIndex: 0,
            specId: 'bldg_soviet_barracks',
            gridX: 10,
            gridY: 10,
        };
        const res = runtime.submitCommand(0, buildCmd);
        (0, vitest_1.expect)(res.valid).toBe(false);
        (0, vitest_1.expect)(res.reason).toContain('credits');
    });
    (0, vitest_1.it)('should generate replay export with header and recorded tick frames', () => {
        runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        const replayJson = runtime.replayRecorder.exportJSON();
        const data = JSON.parse(replayJson);
        (0, vitest_1.expect)(data.header.mapId).toEqual('map_red_square_duel');
        (0, vitest_1.expect)(data.header.seed).toEqual(1337);
    });
});
//# sourceMappingURL=serverMatchRuntime.test.js.map