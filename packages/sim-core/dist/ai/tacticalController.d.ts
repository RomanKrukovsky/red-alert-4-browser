import { GameSimulation } from '../simulation.js';
import { PlayerCommand } from '@ra4/shared-types';
import { AIBlackboard } from './aiBlackboard.js';
import { ArmySquad } from './armyGroupManager.js';
export declare class AITacticalController {
    update(sim: GameSimulation, bb: AIBlackboard, squads: ArmySquad[]): PlayerCommand[];
}
//# sourceMappingURL=tacticalController.d.ts.map