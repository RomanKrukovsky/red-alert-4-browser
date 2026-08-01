import crypto from 'node:crypto';
import { FactionId, MatchState, PlayerSlot, PlayerType, LobbyState } from '@ra4/shared-types';

export interface RoomConfig {
  id: string;
  name: string;
  isPrivate: boolean;
  inviteCode?: string;
  mapId: string;
  hostUserId: string;
  hostIndex: number;
  matchState: MatchState;
  slots: PlayerSlot[];
  contentVersionHash: string;
  createdAt: Date;
}

export class RoomManager {
  private rooms: Map<string, RoomConfig> = new Map();

  constructor() {
    // Initialize default lobby room
    this.createRoom('Default Skirmish Room', 'host-system', false, 'map_red_square_duel');
  }

  public createRoom(name: string, hostUserId: string, isPrivate: boolean = false, mapId: string = 'map_red_square_duel'): RoomConfig {
    const id = crypto.randomUUID().slice(0, 8);
    const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;

    const defaultSlots: PlayerSlot[] = [
      {
        index: 0,
        name: 'Commander 1',
        type: PlayerType.HUMAN,
        factionId: FactionId.USSR,
        team: 0,
        color: '#ff4d4d',
        isReady: false,
        isConnected: false,
      },
      {
        index: 1,
        name: 'AI ИИ-Командир',
        type: PlayerType.AI_MEDIUM,
        factionId: FactionId.ALLIANCE,
        team: 1,
        color: '#4dc3ff',
        isReady: true,
        isConnected: true,
      },
    ];

    const room: RoomConfig = {
      id,
      name,
      isPrivate,
      inviteCode,
      mapId,
      hostUserId,
      hostIndex: 0,
      matchState: MatchState.LOBBY,
      slots: defaultSlots,
      contentVersionHash: 'sha256_official',
      createdAt: new Date(),
    };

    this.rooms.set(id, room);
    return room;
  }

  public getRoom(id: string): RoomConfig | null {
    return this.rooms.get(id) ?? null;
  }

  public listPublicRooms(): RoomConfig[] {
    return Array.from(this.rooms.values()).filter(r => !r.isPrivate && r.matchState === MatchState.LOBBY);
  }

  public joinRoom(roomId: string, playerName: string, userId: string): { room: RoomConfig; slotIndex: number } {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.matchState !== MatchState.LOBBY) {
      throw new Error('Cannot join room: Match is already in progress or finished');
    }

    // Check double connection / existing player slot
    const existingSlot = room.slots.find(s => s.name === playerName);
    if (existingSlot) {
      existingSlot.isConnected = true;
      return { room, slotIndex: existingSlot.index };
    }

    // Find first empty slot
    const emptySlot = room.slots.find(s => !s.isConnected && s.type !== PlayerType.AI_EASY && s.type !== PlayerType.AI_MEDIUM && s.type !== PlayerType.AI_HARD);
    if (!emptySlot) {
      throw new Error('Room is full');
    }

    emptySlot.name = playerName;
    emptySlot.type = PlayerType.HUMAN;
    emptySlot.isConnected = true;
    emptySlot.isReady = false;

    return { room, slotIndex: emptySlot.index };
  }

  public setSlotConfig(roomId: string, slotIndex: number, factionId?: FactionId, playerType?: PlayerType, team?: number): RoomConfig {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const slot = room.slots.find(s => s.index === slotIndex);
    if (!slot) throw new Error('Slot index out of range');

    if (factionId !== undefined) slot.factionId = factionId;
    if (playerType !== undefined) slot.type = playerType;
    if (team !== undefined) slot.team = team;

    return room;
  }

  public setReady(roomId: string, slotIndex: number, isReady: boolean): RoomConfig {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const slot = room.slots.find(s => s.index === slotIndex);
    if (slot) {
      slot.isReady = isReady;
    }
    return room;
  }

  public setMap(roomId: string, mapId: string): RoomConfig {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    room.mapId = mapId;
    return room;
  }

  public leaveRoom(roomId: string, slotIndex: number): RoomConfig | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const slot = room.slots.find(s => s.index === slotIndex);
    if (slot) {
      slot.isConnected = false;
      slot.isReady = false;
    }

    // Host migration if host left
    if (room.hostIndex === slotIndex) {
      const nextHuman = room.slots.find(s => s.isConnected && s.type === PlayerType.HUMAN);
      if (nextHuman) {
        room.hostIndex = nextHuman.index;
      }
    }

    // Cleanup empty room if no connected human players remain (except default room)
    const activeHumans = room.slots.filter(s => s.isConnected && s.type === PlayerType.HUMAN);
    if (activeHumans.length === 0 && room.id !== 'default-room') {
      this.rooms.delete(roomId);
      return null;
    }

    return room;
  }

  public getLobbyState(room: RoomConfig): LobbyState {
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
