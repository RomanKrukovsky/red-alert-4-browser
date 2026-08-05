/// <reference lib="webworker" />
import { GameSimulation, MatchLifecycleManager, MatchLifecycleState } from '@ra4/sim-core';
import { MatchState } from '@ra4/shared-types';
import type { MainToWorkerMessage, WorkerToMainMessage } from './workerProtocol.js';

/**
 * Simulation Web Worker host.
 *
 * Owns the clock: drives the pure MatchLifecycleManager with elapsed wall
 * time measured HERE (worker scope), never inside sim-core. Emits snapshot
 * messages after every executed tick batch. The main thread renders with
 * interpolation and never blocks on simulation work.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

const manager = new MatchLifecycleManager();
let loopHandle: ReturnType<typeof setInterval> | null = null;
let lastTime = 0;
let tickTimeWindow: number[] = [];

function post(message: WorkerToMainMessage): void {
  scope.postMessage(message);
}

function emitSnapshotFrame(alpha: number): void {
  const sim = manager.sim;
  if (!sim) return;
  const snapshot = sim.createSnapshot();
  const avg = tickTimeWindow.length > 0 ? tickTimeWindow.reduce((a, b) => a + b, 0) / tickTimeWindow.length : 0;
  post({
    type: 'SNAPSHOT',
    snapshot,
    alpha,
    matchState: sim.matchState,
    winnerTeam: sim.winnerTeam,
    tickTimeAvgMs: avg,
  });
}

function runLoop(): void {
  stopLoop();
  lastTime = performance.now();
  // ~120 Hz polling interval; the fixed-step accumulator inside the
  // lifecycle converts elapsed time into exact 30 Hz simulation ticks.
  loopHandle = setInterval(() => {
    const now = performance.now();
    const elapsed = now - lastTime;
    lastTime = now;

    const before = performance.now();
    const result = manager.advance(elapsed);
    const after = performance.now();

    if (result.ticksExecuted > 0) {
      tickTimeWindow.push((after - before) / result.ticksExecuted);
      if (tickTimeWindow.length > 30) tickTimeWindow.shift();
      emitSnapshotFrame(result.alpha);
    }
  }, 8);
}

function stopLoop(): void {
  if (loopHandle !== null) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
}

scope.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'INIT': {
        manager.initialize(msg.config);
        tickTimeWindow = [];
        post({ type: 'INITIALIZED' });
        break;
      }
      case 'START': {
        manager.start();
        runLoop();
        break;
      }
      case 'PAUSE': {
        manager.pause();
        stopLoop();
        break;
      }
      case 'RESUME': {
        if (manager.state === MatchLifecycleState.PAUSED) {
          manager.resume();
          runLoop();
        }
        break;
      }
      case 'STOP': {
        manager.stop();
        stopLoop();
        break;
      }
      case 'DISPOSE': {
        stopLoop();
        manager.dispose();
        scope.close();
        break;
      }
      case 'COMMAND': {
        manager.commandBus.dispatch(msg.command);
        break;
      }
      case 'RUN_DETERMINISM_PROBE': {
        const seed = msg.config.seed ?? 1337;
        const probeSim = new GameSimulation(seed);
        probeSim.initMatch(msg.config.players, msg.config.startingCredits);
        for (let i = 0; i < msg.ticks; i++) probeSim.step();
        post({ type: 'DETERMINISM_PROBE_RESULT', ticks: msg.ticks, checksum: probeSim.calculateChecksum(), seed });
        break;
      }
      case 'DEBUG_ELIMINATE_PLAYER': {
        const sim = manager.sim;
        if (sim && sim.matchState === MatchState.IN_GAME) {
          for (const entity of sim.entities.values()) {
            if (entity.playerIndex === msg.playerIndex) entity.hp = 0;
          }
        }
        break;
      }
    }
  } catch (error) {
    const err = error as Error;
    post({ type: 'ERROR', message: err.message, stack: err.stack });
  }
};

post({ type: 'READY' });
