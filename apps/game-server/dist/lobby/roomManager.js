"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const shared_types_1 = require("@ra4/shared-types");
class RoomManager {
    rooms = new Map();
    constructor() {
        // Initialize default lobby room
        this.createRoom('Default Skirmish Room', 'host-system', false, 'map_red_square_duel');
    }
    createRoom(name, hostUserId, isPrivate = false, mapId = 'map_red_square_duel') {
        const id = node_crypto_1.default.randomUUID().slice(0, 8);
        const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;
        const defaultSlots = [
            {
                index: 0,
                name: 'Commander 1',
                type: shared_types_1.PlayerType.HUMAN,
                factionId: shared_types_1.FactionId.USSR,
                team: 0,
                color: '#ff4d4d',
                isReady: false,
                isConnected: false,
            },
            {
                index: 1,
                name: 'Commander 2',
                type: shared_types_1.PlayerType.HUMAN,
                factionId: shared_types_1.FactionId.ALLIANCE,
                team: 1,
                color: '#4dc3ff',
                isReady: false,
                isConnected: false,
            },
            {
                index: 2,
                name: 'Commander 3',
                type: shared_types_1.PlayerType.HUMAN,
                factionId: shared_types_1.FactionId.ORIENTAL_COALITION,
                team: 0,
                color: '#ffd700',
                isReady: false,
                isConnected: false,
            },
            {
                index: 3,
                name: 'AI ИИ-Командир',
                type: shared_types_1.PlayerType.AI_MEDIUM,
                factionId: shared_types_1.FactionId.CHRONOLEGION,
                team: 1,
                color: '#9370db',
                isReady: true,
                isConnected: true,
            },
        ];
        const room = {
            id,
            name,
            isPrivate,
            inviteCode,
            mapId,
            hostUserId,
            hostIndex: 0,
            matchState: shared_types_1.MatchState.LOBBY,
            slots: defaultSlots,
            contentVersionHash: 'sha256_official',
            createdAt: new Date(),
        };
        this.rooms.set(id, room);
        return room;
    }
    getRoom(id) {
        return this.rooms.get(id) ?? null;
    }
    listPublicRooms() {
        return Array.from(this.rooms.values()).filter(r => !r.isPrivate && r.matchState === shared_types_1.MatchState.LOBBY);
    }
    joinRoom(roomId, playerName, userId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} not found`);
        }
        if (room.matchState !== shared_types_1.MatchState.LOBBY) {
            throw new Error('Cannot join room: Match is already in progress or finished');
        }
        // Check double connection / existing player slot
        const existingSlot = room.slots.find(s => s.name === playerName);
        if (existingSlot) {
            existingSlot.isConnected = true;
            return { room, slotIndex: existingSlot.index };
        }
        // Find first empty/disconnected slot
        const emptySlot = room.slots.find(s => !s.isConnected);
        if (!emptySlot) {
            throw new Error('Room is full');
        }
        emptySlot.name = playerName;
        emptySlot.type = shared_types_1.PlayerType.HUMAN;
        emptySlot.isConnected = true;
        emptySlot.isReady = false;
        return { room, slotIndex: emptySlot.index };
    }
    setSlotConfig(roomId, slotIndex, factionId, playerType, team) {
        const room = this.rooms.get(roomId);
        if (!room)
            throw new Error('Room not found');
        const slot = room.slots.find(s => s.index === slotIndex);
        if (!slot)
            throw new Error('Slot index out of range');
        if (factionId !== undefined)
            slot.factionId = factionId;
        if (playerType !== undefined)
            slot.type = playerType;
        if (team !== undefined)
            slot.team = team;
        return room;
    }
    setReady(roomId, slotIndex, isReady) {
        const room = this.rooms.get(roomId);
        if (!room)
            throw new Error('Room not found');
        const slot = room.slots.find(s => s.index === slotIndex);
        if (slot) {
            slot.isReady = isReady;
        }
        return room;
    }
    setMap(roomId, mapId) {
        const room = this.rooms.get(roomId);
        if (!room)
            throw new Error('Room not found');
        room.mapId = mapId;
        return room;
    }
    leaveRoom(roomId, slotIndex) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        const slot = room.slots.find(s => s.index === slotIndex);
        if (slot) {
            slot.isConnected = false;
            slot.isReady = false;
        }
        // Host migration if host left
        if (room.hostIndex === slotIndex) {
            const nextHuman = room.slots.find(s => s.isConnected && s.type === shared_types_1.PlayerType.HUMAN);
            if (nextHuman) {
                room.hostIndex = nextHuman.index;
            }
        }
        // Cleanup empty room if no connected human players remain (except default room)
        const activeHumans = room.slots.filter(s => s.isConnected && s.type === shared_types_1.PlayerType.HUMAN);
        if (activeHumans.length === 0 && room.id !== 'default-room') {
            this.rooms.delete(roomId);
            return null;
        }
        return room;
    }
    getLobbyState(room) {
        return {
            roomId: room.id,
            mapId: room.mapId,
            matchState: room.matchState,
            hostIndex: room.hostIndex,
            slots: room.slots,
            contentVersionHash: room.contentVersionHash,
        };
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=roomManager.js.map