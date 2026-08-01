import { GameSimulation } from './simulation.js';
import { PlayerCommand, FactionId } from '@ra4/shared-types';
import { AIBlackboard } from './ai/aiBlackboard.js';
export declare class SkirmishAIAgent {
    playerIndex: number;
    blackboard: AIBlackboard;
    private scheduler;
    private worldModel;
    private director;
    private economyManager;
    private basePlanner;
    private productionManager;
    private armyGroupManager;
    private tacticalController;
    constructor(playerIndex: number, factionId?: FactionId, difficulty?: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR', personality?: 'AGGRESSIVE' | 'DEFENSIVE' | 'ECONOMIC' | 'ADAPTIVE' | 'RAIDER');
    update(sim: GameSimulation): PlayerCommand[];
}
//# sourceMappingURL=aiAgent.d.ts.map