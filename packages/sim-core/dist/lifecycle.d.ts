import { GameSimulation } from './simulation.js';
import { CommandBus } from './commandBus.js';
import { SimEventEmitter } from './eventEmitter.js';
import { FactionId, PlayerType, WorldSnapshot } from '@ra4/shared-types';
export declare enum MatchLifecycleState {
    UNINITIALIZED = "UNINITIALIZED",
    INITIALIZED = "INITIALIZED",
    RUNNING = "RUNNING",
    PAUSED = "PAUSED",
    STOPPED = "STOPPED",
    DISPOSED = "DISPOSED"
}
export interface MatchConfig {
    seed?: number;
    players: {
        name: string;
        factionId: FactionId;
        type: PlayerType;
        team: number;
    }[];
    tickRate?: number;
    startingCredits?: number;
}
export interface AdvanceResult {
    /** Snapshot of the last executed tick this advance, or null when no tick ran. */
    snapshot: WorldSnapshot | null;
    /** Interpolation alpha [0..1] — fraction of a tick accumulated after the last executed tick. */
    alpha: number;
    /** Number of simulation ticks executed during this advance call. */
    ticksExecuted: number;
}
/**
 * Pure, clock-agnostic match lifecycle.
 *
 * IMPORTANT ARCHITECTURAL BOUNDARY: sim-core must never read wall-clock time
 * (`performance.now`, `Date.now`) or schedule frames (`requestAnimationFrame`).
 * The host environment (browser main thread, Web Worker, Node server, headless
 * test runner) owns the clock and drives the simulation by calling
 * `advance(elapsedMs)` with measured elapsed time, or `tickOnce()` directly.
 */
export declare class MatchLifecycleManager {
    state: MatchLifecycleState;
    sim: GameSimulation | null;
    commandBus: CommandBus;
    events: SimEventEmitter;
    private tickMs;
    private accumulator;
    private catchUpLimit;
    get tickIntervalMs(): number;
    initialize(config: MatchConfig): void;
    /** Transition to RUNNING. The host is responsible for calling advance() afterwards. */
    start(): void;
    /**
     * Advance the simulation by `elapsedMs` of host time using a fixed-step
     * accumulator. Executes zero or more ticks and returns the latest snapshot.
     */
    advance(elapsedMs: number): AdvanceResult;
    /** Execute exactly one simulation tick (flushing queued commands first). */
    tickOnce(): WorldSnapshot | null;
    pause(): void;
    resume(): void;
    stop(): void;
    dispose(): void;
}
//# sourceMappingURL=lifecycle.d.ts.map