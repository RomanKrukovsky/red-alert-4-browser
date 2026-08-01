import { GameSimulation } from '../simulation.js';
import { AIBlackboard } from './aiBlackboard.js';
import { getPersonalityProfile } from './aiPersonalities.js';

export interface ArmySquad {
  id: string;
  type: 'DEFENSE' | 'STRIKE' | 'RECON';
  entityIds: number[];
}

export class AIArmyGroupManager {
  public update(sim: GameSimulation, bb: AIBlackboard): ArmySquad[] {
    const myUnits = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex && !e.isBuilding && e.maxOre === 0);
    const profile = getPersonalityProfile(bb);

    const squads: ArmySquad[] = [
      { id: 'sq_defense', type: 'DEFENSE', entityIds: [] },
      { id: 'sq_strike', type: 'STRIKE', entityIds: [] },
      { id: 'sq_recon', type: 'RECON', entityIds: [] }
    ];

    let defendersAssigned = 0;
    for (const unit of myUnits) {
      if (unit.specId.includes('Scout') && squads[2].entityIds.length === 0) {
        squads[2].entityIds.push(unit.id);
      } else if (defendersAssigned < profile.defenseReserve) {
        squads[0].entityIds.push(unit.id);
        defendersAssigned++;
      } else {
        squads[1].entityIds.push(unit.id);
      }
    }

    return squads;
  }
}
