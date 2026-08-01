import { GameSimulation } from './simulation.js';
import { FactionId, PlayerCommand } from '@ra4/shared-types';
export interface SuperweaponState {
    id: string;
    name: string;
    factionId: string;
    cooldownTicksTotal: number;
    cooldownTicksRemaining: number;
    isReady: boolean;
}
export declare class SuperweaponManager {
    superweaponStates: Map<number, SuperweaponState[]>;
    initPlayerSuperweapons(playerIndex: number, factionId: FactionId): void;
    update(sim: GameSimulation): void;
    executeSuperweaponCommand(sim: GameSimulation, cmd: PlayerCommand): boolean;
}
//# sourceMappingURL=superweaponManager.d.ts.map