"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        // Unknown structure id is rejected before the credit check
        const unknownCmd = { type: shared_types_1.CommandType.BUILD_STRUCTURE, playerIndex: 0, structureId: 'bldg_fake', gridX: 10, gridY: 10, entityIds: [], tick: 0 };
        const unknownRes = runtime.submitCommand(0, unknownCmd);
        (0, vitest_1.expect)(unknownRes.valid).toBe(false);
        (0, vitest_1.expect)(unknownRes.reason).toContain('Unknown structure');
        // Real structure with zero credits is rejected for cost
        const buildCmd = { type: shared_types_1.CommandType.BUILD_STRUCTURE, playerIndex: 0, structureId: 'SU_ThermalPower', gridX: 30, gridY: 30, entityIds: [], tick: 0 };
        const res = runtime.submitCommand(0, buildCmd);
        (0, vitest_1.expect)(res.valid).toBe(false);
        (0, vitest_1.expect)(res.reason).toContain('credits');
    });
    (0, vitest_1.it)('should generate replay v2 export with header and decodable container', async () => {
        runtime = new matchRuntime_1.AuthoritativeMatchRuntime('map_red_square_duel', [
            { playerIndex: 0, name: 'Player 1', factionId: shared_types_1.FactionId.USSR, team: 0, type: shared_types_1.PlayerType.HUMAN, ws: null, isConnected: true, lastAckTick: 0, reconnectToken: 'token-0' },
        ]);
        const { decodeReplay } = await Promise.resolve().then(() => __importStar(require('@ra4/replay')));
        const data = decodeReplay(runtime.exportReplay());
        (0, vitest_1.expect)(data.header.mapId).toEqual('map_red_square_duel');
        (0, vitest_1.expect)(data.header.seed).toEqual(1337);
        (0, vitest_1.expect)(data.header.formatVersion).toEqual(2);
    });
});
//# sourceMappingURL=serverMatchRuntime.test.js.map