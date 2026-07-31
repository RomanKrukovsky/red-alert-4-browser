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
}

export class MatchLifecycleManager {
  public state: MatchLifecycleState = MatchLifecycleState.UNINITIALIZED;
  public sim: GameSimulation | null = null;
  public commandBus: CommandBus = new CommandBus();
  public events: SimEventEmitter = new SimEventEmitter();

  private tickMs: number = 33.33; // 30 ticks per second
  private accumulator: number = 0;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private catchUpLimit: number = 5; // max ticks per frame to prevent spiral of death

  public initialize(config: MatchConfig): void {
    if (this.state !== MatchLifecycleState.UNINITIALIZED && this.state !== MatchLifecycleState.STOPPED) {
      this.dispose();
    }

    const seed = config.seed ?? 1337;
    this.tickMs = 1000 / (config.tickRate ?? 30);
    this.sim = new GameSimulation(seed);
    this.sim.initMatch(config.players);

    this.state = MatchLifecycleState.INITIALIZED;
  }

  public start(onTickRender?: (snapshot: WorldSnapshot, alphaInterp: number) => void): void {
    if (this.state !== MatchLifecycleState.INITIALIZED && this.state !== MatchLifecycleState.PAUSED) {
      throw new Error(`Cannot start match in state: ${this.state}`);
    }

    this.state = MatchLifecycleState.RUNNING;
    this.lastTime = performance.now();
    this.accumulator = 0;

    const gameLoop = (currentTime: number) => {
      if (this.state !== MatchLifecycleState.RUNNING) return;

      const delta = currentTime - this.lastTime;
      this.lastTime = currentTime;
      this.accumulator += delta;

      let ticksExecuted = 0;
      let snapshot: WorldSnapshot | null = null;

      while (this.accumulator >= this.tickMs && ticksExecuted < this.catchUpLimit) {
        if (this.sim) {
          const pendingCmds = this.commandBus.flush();
          this.sim.processCommands(pendingCmds);
          snapshot = this.sim.step();
        }
        this.accumulator -= this.tickMs;
        ticksExecuted++;
      }

      // Spiral of death prevention reset
      if (this.accumulator > this.tickMs * this.catchUpLimit) {
        this.accumulator = 0;
      }

      const alphaInterp = Math.min(1.0, Math.max(0.0, this.accumulator / this.tickMs));

      if (onTickRender && snapshot) {
        onTickRender(snapshot, alphaInterp);
      }

      this.animationFrameId = requestAnimationFrame(gameLoop);
    };

    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  public pause(): void {
    if (this.state === MatchLifecycleState.RUNNING) {
      this.state = MatchLifecycleState.PAUSED;
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  public resume(onTickRender?: (snapshot: WorldSnapshot, alphaInterp: number) => void): void {
    if (this.state === MatchLifecycleState.PAUSED) {
      this.start(onTickRender);
    }
  }

  public stop(): void {
    this.state = MatchLifecycleState.STOPPED;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.commandBus.clear();
    this.events.clear();
    this.sim = null;
    this.state = MatchLifecycleState.DISPOSED;
  }
}
