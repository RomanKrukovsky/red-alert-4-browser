import { GameSimulation } from './simulation.js';
import { CommandBus } from './commandBus.js';
import { SimEventEmitter } from './eventEmitter.js';
export var MatchLifecycleState;
(function (MatchLifecycleState) {
    MatchLifecycleState["UNINITIALIZED"] = "UNINITIALIZED";
    MatchLifecycleState["INITIALIZED"] = "INITIALIZED";
    MatchLifecycleState["RUNNING"] = "RUNNING";
    MatchLifecycleState["PAUSED"] = "PAUSED";
    MatchLifecycleState["STOPPED"] = "STOPPED";
    MatchLifecycleState["DISPOSED"] = "DISPOSED";
})(MatchLifecycleState || (MatchLifecycleState = {}));
/**
 * Pure, clock-agnostic match lifecycle.
 *
 * IMPORTANT ARCHITECTURAL BOUNDARY: sim-core must never read wall-clock time
 * (`performance.now`, `Date.now`) or schedule frames (`requestAnimationFrame`).
 * The host environment (browser main thread, Web Worker, Node server, headless
 * test runner) owns the clock and drives the simulation by calling
 * `advance(elapsedMs)` with measured elapsed time, or `tickOnce()` directly.
 */
export class MatchLifecycleManager {
    state = MatchLifecycleState.UNINITIALIZED;
    sim = null;
    commandBus = new CommandBus();
    events = new SimEventEmitter();
    tickMs = 1000 / 30; // 30 ticks per second
    accumulator = 0;
    catchUpLimit = 5; // max ticks per advance to prevent spiral of death
    get tickIntervalMs() {
        return this.tickMs;
    }
    initialize(config) {
        if (this.state !== MatchLifecycleState.UNINITIALIZED && this.state !== MatchLifecycleState.STOPPED) {
            this.dispose();
        }
        const seed = config.seed ?? 1337;
        this.tickMs = 1000 / (config.tickRate ?? 30);
        this.accumulator = 0;
        this.sim = new GameSimulation(seed, undefined, undefined, config.mapId);
        this.sim.initMatch(config.players, config.startingCredits);
        this.state = MatchLifecycleState.INITIALIZED;
    }
    /** Transition to RUNNING. The host is responsible for calling advance() afterwards. */
    start() {
        if (this.state !== MatchLifecycleState.INITIALIZED && this.state !== MatchLifecycleState.PAUSED) {
            throw new Error(`Cannot start match in state: ${this.state}`);
        }
        this.state = MatchLifecycleState.RUNNING;
        this.accumulator = 0;
    }
    /**
     * Advance the simulation by `elapsedMs` of host time using a fixed-step
     * accumulator. Executes zero or more ticks and returns the latest snapshot.
     */
    advance(elapsedMs) {
        if (this.state !== MatchLifecycleState.RUNNING) {
            return { snapshot: null, alpha: 0, ticksExecuted: 0 };
        }
        this.accumulator += Math.max(0, elapsedMs);
        let ticksExecuted = 0;
        let snapshot = null;
        while (this.accumulator >= this.tickMs && ticksExecuted < this.catchUpLimit) {
            snapshot = this.tickOnce();
            this.accumulator -= this.tickMs;
            ticksExecuted++;
        }
        // Spiral of death prevention reset
        if (this.accumulator > this.tickMs * this.catchUpLimit) {
            this.accumulator = 0;
        }
        const alpha = Math.min(1.0, Math.max(0.0, this.accumulator / this.tickMs));
        return { snapshot, alpha, ticksExecuted };
    }
    /** Execute exactly one simulation tick (flushing queued commands first). */
    tickOnce() {
        if (!this.sim)
            return null;
        const pendingCmds = this.commandBus.flush();
        this.sim.processCommands(pendingCmds);
        return this.sim.step();
    }
    pause() {
        if (this.state === MatchLifecycleState.RUNNING) {
            this.state = MatchLifecycleState.PAUSED;
        }
    }
    resume() {
        if (this.state === MatchLifecycleState.PAUSED) {
            this.start();
        }
    }
    stop() {
        this.state = MatchLifecycleState.STOPPED;
    }
    dispose() {
        this.stop();
        this.commandBus.clear();
        this.events.clear();
        this.sim = null;
        this.state = MatchLifecycleState.DISPOSED;
    }
}
//# sourceMappingURL=lifecycle.js.map