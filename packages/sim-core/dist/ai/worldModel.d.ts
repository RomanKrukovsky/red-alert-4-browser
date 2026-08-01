import { GameSimulation } from '../simulation.js';
import { AIBlackboard, IntelMemoryEntry } from './aiBlackboard.js';
export declare class AIWorldModel {
    update(sim: GameSimulation, bb: AIBlackboard): void;
    getKnownEnemyTargets(bb: AIBlackboard): IntelMemoryEntry[];
    getKnownEnemyHQ(bb: AIBlackboard): IntelMemoryEntry | null;
}
//# sourceMappingURL=worldModel.d.ts.map