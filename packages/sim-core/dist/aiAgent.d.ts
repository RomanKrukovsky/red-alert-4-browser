import { GameSimulation } from './simulation.js';
import { PlayerCommand } from '@ra4/shared-types';
export declare class SkirmishAIAgent {
    playerIndex: number;
    private evalIntervalTicks;
    constructor(playerIndex: number);
    update(sim: GameSimulation): PlayerCommand[];
}
//# sourceMappingURL=aiAgent.d.ts.map