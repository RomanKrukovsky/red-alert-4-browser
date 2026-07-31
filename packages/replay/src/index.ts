import { PlayerCommand, FactionId, PlayerType } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';

export interface ReplayHeader {
  mapId: string;
  seed: number;
  contentHash: string;
  players: { name: string; factionId: FactionId; type: PlayerType; team: number }[];
  durationTicks: number;
}

export interface ReplayFrame {
  tick: number;
  commands: PlayerCommand[];
}

export interface ReplayData {
  header: ReplayHeader;
  frames: ReplayFrame[];
}

export class ReplayRecorder {
  public header: ReplayHeader;
  public frames: ReplayFrame[] = [];

  constructor(header: ReplayHeader) {
    this.header = header;
  }

  public recordTick(tick: number, commands: PlayerCommand[]): void {
    if (commands.length > 0) {
      this.frames.push({ tick, commands });
    }
    this.header.durationTicks = tick;
  }

  public exportJSON(): string {
    return JSON.stringify({
      header: this.header,
      frames: this.frames
    }, null, 2);
  }
}

export class ReplayPlayer {
  public data: ReplayData;
  public sim: GameSimulation;
  public currentTick: number = 0;
  private frameIndex: number = 0;

  constructor(replayJson: string) {
    this.data = JSON.parse(replayJson) as ReplayData;
    this.sim = new GameSimulation(this.data.header.seed);
    this.sim.initMatch(this.data.header.players);
  }

  public step(): boolean {
    if (this.currentTick >= this.data.header.durationTicks) {
      return false;
    }

    const currentFrame = this.data.frames[this.frameIndex];
    if (currentFrame && currentFrame.tick === this.currentTick) {
      this.sim.processCommands(currentFrame.commands);
      this.frameIndex++;
    }

    this.sim.step();
    this.currentTick++;
    return true;
  }
}
