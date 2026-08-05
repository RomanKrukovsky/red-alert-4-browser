import { GameSimulation } from './simulation.js';
import { CommandBus } from './commandBus.js';
import { SimEventEmitter } from './eventEmitter.js';
import { FactionId, PlayerType, WorldSnapshot } from '@ra4/shared-types';

export enum MatchLifecycleState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZED = 'INITIALIZED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  DISPOSED = 'DISPOSED'
}

export interface MatchConfig {
  seed?: number;
  players: { name: string; factionId: FactionId; type: PlayerType; team: number }[];
  tickRate?: number; // default 30 Hz
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
export class MatchLifecycleManager {
  public state: MatchLifecycleState = MatchLifecycleState.UNINITIALIZED;
  public sim: GameSimulation | null = null;
  public commandBus: CommandBus = new CommandBus();
  public events: SimEventEmitter = new SimEventEmitter();

  private tickMs: number = 1000 / 30; // 30 ticks per second
  private accumulator: number = 0;
  private catchUpLimit: number = 5; // max ticks per advance to prevent spiral of death

  public get tickIntervalMs(): number {
    return this.tickMs;
  }

  public initialize(config: MatchConfig): void {
    if (this.state !== MatchLifecycleState.UNINITIALIZED && this.state !== MatchLifecycleState.STOPPED) {
      this.dispose();
    }

    const seed = config.seed ?? 1337;
    this.tickMs = 1000 / (config.tickRate ?? 30);
    this.accumulator = 0;
    this.sim = new GameSimulation(seed);
    this.sim.initMatch(config.players, config.startingCredits);

    this.state = MatchLifecycleState.INITIALIZED;
  }

  /** Transition to RUNNING. The host is responsible for calling advance() afterwards. */
  public start(): void {
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
  public advance(elapsedMs: number): AdvanceResult {
    if (this.state !== MatchLifecycleState.RUNNING) {
      return { snapshot: null, alpha: 0, ticksExecuted: 0 };
    }

    this.accumulator += Math.max(0, elapsedMs);

    let ticksExecuted = 0;
    let snapshot: WorldSnapshot | null = null;

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
  public tickOnce(): WorldSnapshot | null {
    if (!this.sim) return null;
    const pendingCmds = this.commandBus.flush();
    this.sim.processCommands(pendingCmds);
    return this.sim.step();
  }

  public pause(): void {
    if (this.state === MatchLifecycleState.RUNNING) {
      this.state = MatchLifecycleState.PAUSED;
    }
  }

  public resume(): void {
    if (this.state === MatchLifecycleState.PAUSED) {
      this.start();
    }
  }

  public stop(): void {
    this.state = MatchLifecycleState.STOPPED;
  }

  public dispose(): void {
    this.stop();
    this.commandBus.clear();
    this.events.clear();
    this.sim = null;
    this.state = MatchLifecycleState.DISPOSED;
  }
}
