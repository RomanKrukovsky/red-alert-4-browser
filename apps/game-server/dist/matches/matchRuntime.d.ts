import { WebSocket } from 'ws';
import { GameSimulation } from '@ra4/sim-core';
import { ReplayRecorder } from '@ra4/replay';
import { FactionId, MatchState, PlayerCommand, PlayerType, ServerMessage, WorldSnapshot } from '@ra4/shared-types';
export interface MatchPlayerSession {
    playerIndex: number;
    userId?: string;
    name: string;
    factionId: FactionId;
    team: number;
    type: PlayerType;
    ws: WebSocket | null;
    isConnected: boolean;
    lastAckTick: number;
    reconnectToken: string;
}
export declare class AuthoritativeMatchRuntime {
    readonly matchId: string;
    readonly seed: number;
    readonly mapId: string;
    matchState: MatchState;
    readonly sim: GameSimulation;
    readonly replayRecorder: ReplayRecorder;
    players: Map<number, MatchPlayerSession>;
    tickBuffer: PlayerCommand[];
    snapshotHistory: Map<number, WorldSnapshot>;
    private timer;
    private readonly tickRateHz;
    private readonly tickIntervalMs;
    constructor(mapId: string, playerConfigs: MatchPlayerSession[], seed?: number);
    start(): void;
    submitCommand(playerIndex: number, command: PlayerCommand): {
        valid: boolean;
        reason?: string;
    };
    private tick;
    handleReconnect(playerIndex: number, reconnectToken: string, lastTick: number, ws: WebSocket): boolean;
    handleDisconnect(playerIndex: number): void;
    finishMatch(reason: string): Promise<void>;
    broadcast(msg: ServerMessage): void;
    stop(): void;
}
//# sourceMappingURL=matchRuntime.d.ts.map