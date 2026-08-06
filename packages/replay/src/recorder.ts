import { PlayerCommand } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
import {
  encodeReplay, ReplayCheckpoint, ReplayCommandFrame, ReplayDataV2, ReplayHeaderV2, ReplayKeyframe,
  REPLAY_FORMAT_VERSION,
} from './format.js';

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
export class ReplayRecorderV2 {
  private frames: ReplayCommandFrame[] = [];
  private checkpoints: ReplayCheckpoint[] = [];
  private keyframes: ReplayKeyframe[] = [];
  private durationTicks = 0;
  private result: ReplayHeaderV2['result'] = null;

  private readonly checkpointInterval: number;
  private readonly keyframeInterval: number;

  constructor(private config: RecorderConfig) {
    this.checkpointInterval = config.checkpointIntervalTicks ?? 300;
    this.keyframeInterval = config.keyframeIntervalTicks ?? 1800;
  }

  public recordTick(sim: GameSimulation, tick: number, commands: PlayerCommand[]): void {
    if (commands.length > 0) {
      this.frames.push({ tick, commands: commands.map((c) => ({ ...c })) });
    }
    if (tick % this.checkpointInterval === 0) {
      this.checkpoints.push({ tick, checksum: sim.calculateChecksum() });
    }
    if (tick % this.keyframeInterval === 0) {
      this.keyframes.push({ tick, snapshot: sim.createSnapshot() });
    }
    this.durationTicks = tick;
  }

  public recordResult(winnerTeam: number, reason: string): void {
    this.result = { winnerTeam, reason };
  }

  public export(): Uint8Array {
    const header: ReplayHeaderV2 = {
      formatVersion: REPLAY_FORMAT_VERSION,
      simVersion: this.config.simVersion,
      contentHash: this.config.contentHash,
      protocolVersion: this.config.protocolVersion,
      mapId: this.config.mapId,
      seed: this.config.seed,
      tickRate: this.config.tickRate,
      players: this.config.players,
      startingCredits: this.config.startingCredits,
      durationTicks: this.durationTicks,
      result: this.result,
      recordedAtIso: this.config.recordedAtIso,
    };
    const data: ReplayDataV2 = {
      header,
      frames: this.frames,
      checkpoints: this.checkpoints,
      keyframes: this.keyframes,
    };
    return encodeReplay(data);
  }
}
