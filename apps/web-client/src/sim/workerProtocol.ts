import { MatchState, PlayerCommand, WorldSnapshot } from '@ra4/shared-types';
import type { MatchConfig } from '@ra4/sim-core';

/**
 * Structured message protocol between the main thread and the simulation
 * Web Worker. The simulation never touches the DOM/React; the main thread
 * never touches simulation state directly. Snapshots are the only data
 * that crosses the boundary sim → UI; commands are the only data UI → sim.
 */

export type MainToWorkerMessage =
  | { type: 'INIT'; config: MatchConfig }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'DISPOSE' }
  | { type: 'COMMAND'; command: PlayerCommand }
  /** Debug/QA-only: forcibly zero HP of one player's entities (game-doctor). */
  | { type: 'DEBUG_ELIMINATE_PLAYER'; playerIndex: number }
  /**
   * QA-only: run a fresh simulation for `ticks` ticks synchronously and
   * report the final checksum. Used by the cross-environment determinism
   * gate (browser Worker vs Node) — must never be called during a match.
   */
  | { type: 'RUN_DETERMINISM_PROBE'; config: MatchConfig; ticks: number };

export interface SnapshotMessage {
  type: 'SNAPSHOT';
  snapshot: WorldSnapshot;
  alpha: number;
  matchState: MatchState;
  winnerTeam: number;
  /** Average sim tick execution time (ms) over the last second, for perf HUD/QA. */
  tickTimeAvgMs: number;
}

export type WorkerToMainMessage =
  | { type: 'READY' }
  | { type: 'INITIALIZED' }
  | SnapshotMessage
  | { type: 'DETERMINISM_PROBE_RESULT'; ticks: number; checksum: number; seed: number }
  | { type: 'ERROR'; message: string; stack?: string };
