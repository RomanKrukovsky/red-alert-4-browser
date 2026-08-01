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
export declare class RoomManager {
    private rooms;
    constructor();
    createRoom(name: string, hostUserId: string, isPrivate?: boolean, mapId?: string): RoomConfig;
    getRoom(id: string): RoomConfig | null;
    listPublicRooms(): RoomConfig[];
    joinRoom(roomId: string, playerName: string, userId: string): {
        room: RoomConfig;
        slotIndex: number;
    };
    setSlotConfig(roomId: string, slotIndex: number, factionId?: FactionId, playerType?: PlayerType, team?: number): RoomConfig;
    setReady(roomId: string, slotIndex: number, isReady: boolean): RoomConfig;
    setMap(roomId: string, mapId: string): RoomConfig;
    leaveRoom(roomId: string, slotIndex: number): RoomConfig | null;
    getLobbyState(room: RoomConfig): LobbyState;
}
//# sourceMappingURL=roomManager.d.ts.map