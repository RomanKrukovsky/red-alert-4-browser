import { PlayerCommand } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
import { ReplayHeaderV2 } from './format.js';
export interface RecorderConfig {
    mapId: string;
    seed: number;
    tickRate: number;
    simVersion: string;
    contentHash: string;
    protocolVersion: number;
    players: ReplayHeaderV2['players'];
    startingCredits: number;
    /** ISO timestamp injected by the host (sim-core purity: no Date here). */
    recordedAtIso: string;
    /** Full-state checksum every N ticks (default 300 = every 10 s at 30 Hz). */
    checkpointIntervalTicks?: number;
    /** Snapshot keyframe every N ticks for scrubbing (default 1800 = 60 s). */
    keyframeIntervalTicks?: number;
}
/**
 * Replay v2 recorder. The host (match server / local match) calls
 * `recordTick` after every executed simulation tick with the commands that
 * were applied on that tick. Checkpoints and keyframes are captured from
 * the live simulation on their intervals.
 */
export declare class ReplayRecorderV2 {
    private config;
    private frames;
    private checkpoints;
    private keyframes;
    private durationTicks;
    private result;
    private readonly checkpointInterval;
    private readonly keyframeInterval;
    constructor(config: RecorderConfig);
    recordTick(sim: GameSimulation, tick: number, commands: PlayerCommand[]): void;
    recordResult(winnerTeam: number, reason: string): void;
    export(): Uint8Array;
}
//# sourceMappingURL=recorder.d.ts.map