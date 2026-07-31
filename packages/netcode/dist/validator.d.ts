import { PlayerCommand } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
export interface ValidationResult {
    valid: boolean;
    reason?: string;
}
export declare function validatePlayerCommand(cmd: PlayerCommand, sim: GameSimulation, playerIndex: number): ValidationResult;
//# sourceMappingURL=validator.d.ts.map