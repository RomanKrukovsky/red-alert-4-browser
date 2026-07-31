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
}
export declare class MatchLifecycleManager {
    state: MatchLifecycleState;
    sim: GameSimulation | null;
    commandBus: CommandBus;
    events: SimEventEmitter;
    private tickMs;
    private accumulator;
    private lastTime;
    private animationFrameId;
    private catchUpLimit;
    initialize(config: MatchConfig): void;
    start(onTickRender?: (snapshot: WorldSnapshot, alphaInterp: number) => void): void;
    pause(): void;
    resume(onTickRender?: (snapshot: WorldSnapshot, alphaInterp: number) => void): void;
    stop(): void;
    dispose(): void;
}
//# sourceMappingURL=lifecycle.d.ts.map