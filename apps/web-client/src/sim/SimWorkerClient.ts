import { MatchState, PlayerCommand, WorldSnapshot } from '@ra4/shared-types';
import type { MatchConfig } from '@ra4/sim-core';
import type { MainToWorkerMessage, SnapshotMessage, WorkerToMainMessage } from './workerProtocol.js';

export interface SimFrame {
  snapshot: WorldSnapshot;
  alpha: number;
  matchState: MatchState;
  winnerTeam: number;
  tickTimeAvgMs: number;
}

/**
 * Main-thread facade over the simulation Web Worker.
 *
 * The UI/renderer subscribe to snapshot frames; commands are the only way
 * to influence the simulation. No game entity state lives in React.
 */
export class SimWorkerClient {
  private worker: Worker;
  private frameHandler: ((frame: SimFrame) => void) | null = null;
  private errorHandler: ((message: string) => void) | null = null;
  private readyPromise: Promise<void>;
  private initializedResolve: (() => void) | null = null;
  private disposed = false;

  /** Latest frame, for pull-style consumers (game-doctor, debug). */
  public lastFrame: SimFrame | null = null;

  constructor() {
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });

    let readyResolve: () => void;
    this.readyPromise = new Promise<void>((resolve) => { readyResolve = resolve; });

    this.worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'READY':
          readyResolve();
          break;
        case 'INITIALIZED':
          this.initializedResolve?.();
          this.initializedResolve = null;
          break;
        case 'SNAPSHOT': {
          const frame = this.toFrame(msg);
          this.lastFrame = frame;
          this.frameHandler?.(frame);
          break;
        }
        case 'ERROR':
          console.error('[SimWorker]', msg.message, msg.stack);
          this.errorHandler?.(msg.message);
          break;
      }
    };

    this.worker.onerror = (event) => {
      console.error('[SimWorker] uncaught', event.message);
      this.errorHandler?.(event.message);
    };
  }

  private toFrame(msg: SnapshotMessage): SimFrame {
    return {
      snapshot: msg.snapshot,
      alpha: msg.alpha,
      matchState: msg.matchState,
      winnerTeam: msg.winnerTeam,
      tickTimeAvgMs: msg.tickTimeAvgMs,
    };
  }

  public onFrame(handler: (frame: SimFrame) => void): void {
    this.frameHandler = handler;
  }

  public onError(handler: (message: string) => void): void {
    this.errorHandler = handler;
  }

  public async initialize(config: MatchConfig): Promise<void> {
    await this.readyPromise;
    if (this.disposed) return;
    const initialized = new Promise<void>((resolve) => { this.initializedResolve = resolve; });
    this.send({ type: 'INIT', config });
    await initialized;
  }

  public start(): void {
    this.send({ type: 'START' });
  }

  public pause(): void {
    this.send({ type: 'PAUSE' });
  }

  public resume(): void {
    this.send({ type: 'RESUME' });
  }

  public stop(): void {
    this.send({ type: 'STOP' });
  }

  public dispatchCommand(command: PlayerCommand): { accepted: boolean } {
    this.send({ type: 'COMMAND', command });
    return { accepted: true };
  }

  /** Debug/QA-only hook used by game-doctor victory scenario. */
  public debugEliminatePlayer(playerIndex: number): void {
    this.send({ type: 'DEBUG_ELIMINATE_PLAYER', playerIndex });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.frameHandler = null;
    this.errorHandler = null;
    try {
      this.send({ type: 'DISPOSE' });
    } finally {
      // Give the worker a moment to close itself, then hard-terminate.
      const w = this.worker;
      setTimeout(() => w.terminate(), 250);
    }
  }

  private send(message: MainToWorkerMessage): void {
    if (this.disposed && message.type !== 'DISPOSE') return;
    this.worker.postMessage(message);
  }
}
