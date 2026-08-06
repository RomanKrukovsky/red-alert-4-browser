import { WorldSnapshot } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
import { ReplayDataV2, ReplayFormatError } from './format.js';
export interface ReplayVerification {
    verified: boolean;
    checkpointsChecked: number;
    firstDivergenceTick: number | null;
    expectedChecksum?: number;
    actualChecksum?: number;
}
/**
 * Replay v2 player — deterministic re-simulation of the command log.
 *
 * step() advances one tick, applying recorded commands at their exact
 * ticks and validating recorded checkpoints as it passes them.
 * seekToTick() re-simulates from tick 0 (exactness beats keyframe
 * approximation; keyframes exist for instant scrub *previews* in the UI).
 */
export declare class ReplayPlayerV2 {
    readonly data: ReplayDataV2;
    sim: GameSimulation;
    currentTick: number;
    private frameIndex;
    private checkpointIndex;
    private divergenceTick;
    private checkpointsChecked;
    private lastDivergence;
    constructor(bytes: Uint8Array);
    private freshSim;
    get durationTicks(): number;
    /** Advance exactly one tick. Returns false when the replay is exhausted. */
    step(): boolean;
    /** Nearest keyframe snapshot at or before the tick — for instant UI preview. */
    previewAt(tick: number): WorldSnapshot | null;
    /** Exact seek: deterministic re-simulation from tick 0 to the target tick. */
    seekToTick(targetTick: number): void;
    /** Play the whole replay headlessly and report checkpoint verification. */
    verify(): ReplayVerification;
}
export { ReplayFormatError };
//# sourceMappingURL=player.d.ts.map