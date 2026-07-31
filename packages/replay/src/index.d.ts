import { PlayerCommand, FactionId, PlayerType } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
export interface ReplayHeader {
    mapId: string;
    seed: number;
    contentHash: string;
    players: {
        name: string;
        factionId: FactionId;
        type: PlayerType;
        team: number;
    }[];
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
export declare class ReplayRecorder {
    header: ReplayHeader;
    frames: ReplayFrame[];
    constructor(header: ReplayHeader);
    recordTick(tick: number, commands: PlayerCommand[]): void;
    exportJSON(): string;
}
export declare class ReplayPlayer {
    data: ReplayData;
    sim: GameSimulation;
    currentTick: number;
    private frameIndex;
    constructor(replayJson: string);
    step(): boolean;
}
//# sourceMappingURL=index.d.ts.map