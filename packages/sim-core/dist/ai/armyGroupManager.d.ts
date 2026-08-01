import { GameSimulation } from '../simulation.js';
import { AIBlackboard } from './aiBlackboard.js';
export interface ArmySquad {
    id: string;
    type: 'DEFENSE' | 'STRIKE' | 'RECON';
    entityIds: number[];
}
export declare class AIArmyGroupManager {
    update(sim: GameSimulation, bb: AIBlackboard): ArmySquad[];
}
//# sourceMappingURL=armyGroupManager.d.ts.map