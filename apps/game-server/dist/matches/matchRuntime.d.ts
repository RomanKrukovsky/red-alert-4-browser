import { WebSocket } from 'ws';
import { GameSimulation } from '@ra4/sim-core';
import { WireKind } from '@ra4/netcode';
import { ReplayRecorderV2 } from '@ra4/replay';
import { FactionId, MatchState, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';
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
    /** Per-player outbound sequence counter (Protocol v1 envelopes). */
    outSeq?: number;
    /** Last client-reported checksum, for desync detection. */
    lastReportedChecksum?: {
        tick: number;
        checksum: number;
    };
    /** Wall-clock ms of disconnect, for the reconnect window. */
    disconnectedAtMs?: number;
}
export interface DesyncEvent {
    playerIndex: number;
    tick: number;
    serverChecksum: number;
    clientChecksum: number;
}
/** Reconnect window: a disconnected player may resume within this period. */
export declare const RECONNECT_WINDOW_MS = 90000;
/**
 * Server-authoritative match runtime (Protocol v1).
 *
 * The server simulation is the single source of truth:
 *  - clients submit commands (binary SUBMIT_COMMANDS frames);
 *  - every command is validated against the authoritative state;
 *  - validated commands are applied on the next tick and broadcast in
 *    binary TICK_FRAME messages (clients re-simulate deterministically);
 *  - periodic CHECKSUM_STATE lets clients verify sync; client
 *    CHECKSUM_REPORTs are compared for desync detection;
 *  - the match is recorded with ReplayRecorderV2 (command log +
 *    checkpoints + keyframes) and persisted at match end.
 */
export declare class AuthoritativeMatchRuntime {
    readonly matchId: string;
    readonly seed: number;
    readonly mapId: string;
    matchState: MatchState;
    readonly sim: GameSimulation;
    readonly replayRecorder: ReplayRecorderV2;
    players: Map<number, MatchPlayerSession>;
    tickBuffer: PlayerCommand[];
    snapshotHistory: Map<number, WorldSnapshot>;
    desyncEvents: DesyncEvent[];
    /** Invoked once when the match finishes, so the host can archive the replay. */
    onFinished: ((runtime: AuthoritativeMatchRuntime) => void) | null;
    private timer;
    private readonly tickRateHz;
    private readonly tickIntervalMs;
    private readonly checksumBroadcastInterval;
    /** Commands accepted per player per tick (anti-flood). */
    private readonly maxCommandsPerPlayerPerTick;
    private commandCountThisTick;
    constructor(mapId: string, playerConfigs: MatchPlayerSession[], seed?: number);
    start(): void;
    submitCommand(playerIndex: number, command: PlayerCommand): {
        valid: boolean;
        reason?: string;
    };
    /** Client checksum report — compare against recorded server checksums. */
    reportChecksum(playerIndex: number, tick: number, checksum: number): void;
    private tick;
    handleReconnect(playerIndex: number, reconnectToken: string, _lastTick: number, ws: WebSocket): boolean;
    handleDisconnect(playerIndex: number): void;
    finishMatch(reason: string): Promise<void>;
    /** Export the replay bytes (for tests / download endpoints). */
    exportReplay(): Uint8Array;
    private sendTo;
    broadcastKind(kind: WireKind, payload: Uint8Array): void;
    stop(): void;
}
//# sourceMappingURL=matchRuntime.d.ts.map