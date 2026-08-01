"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const roomManager_js_1 = require("../lobby/roomManager.js");
const shared_types_1 = require("@ra4/shared-types");
(0, vitest_1.describe)('Server Lobby & Room Lifecycle Suite', () => {
    (0, vitest_1.it)('should create room and allocate default player slots', () => {
        const manager = new roomManager_js_1.RoomManager();
        const room = manager.createRoom('Skirmish Arena', 'host-1', false);
        (0, vitest_1.expect)(room.id).toBeDefined();
        (0, vitest_1.expect)(room.name).toEqual('Skirmish Arena');
        (0, vitest_1.expect)(room.slots.length).toBeGreaterThanOrEqual(2);
    });
    (0, vitest_1.it)('should allow joining room and assign empty slot', () => {
        const manager = new roomManager_js_1.RoomManager();
        const room = manager.createRoom('Custom Room', 'host-1', false);
        const { slotIndex } = manager.joinRoom(room.id, 'Player Two', 'user-2');
        (0, vitest_1.expect)(slotIndex).toBeDefined();
        const updatedRoom = manager.getRoom(room.id);
        (0, vitest_1.expect)(updatedRoom?.slots[slotIndex].name).toEqual('Player Two');
        (0, vitest_1.expect)(updatedRoom?.slots[slotIndex].isConnected).toBe(true);
    });
    (0, vitest_1.it)('should update slot faction, team, and ready states', () => {
        const manager = new roomManager_js_1.RoomManager();
        const room = manager.createRoom('Test Room', 'host-1', false);
        manager.setSlotConfig(room.id, 0, shared_types_1.FactionId.ALLIANCE, shared_types_1.PlayerType.HUMAN, 1);
        manager.setReady(room.id, 0, true);
        const updated = manager.getRoom(room.id);
        (0, vitest_1.expect)(updated?.slots[0].factionId).toEqual(shared_types_1.FactionId.ALLIANCE);
        (0, vitest_1.expect)(updated?.slots[0].team).toEqual(1);
        (0, vitest_1.expect)(updated?.slots[0].isReady).toBe(true);
    });
    (0, vitest_1.it)('should migrate host when host leaves room', () => {
        const manager = new roomManager_js_1.RoomManager();
        const room = manager.createRoom('Host Test Room', 'user-1', false);
        manager.joinRoom(room.id, 'Host Player', 'user-1');
        manager.joinRoom(room.id, 'Second Player', 'user-2');
        manager.leaveRoom(room.id, 0);
        const updated = manager.getRoom(room.id);
        (0, vitest_1.expect)(updated?.hostIndex).toEqual(1);
    });
});
//# sourceMappingURL=serverLobby.test.js.map