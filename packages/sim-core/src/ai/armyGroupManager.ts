import { GameSimulation } from '../simulation.js';
import { AIBlackboard } from './aiBlackboard.js';

export interface ArmySquad {
  id: string;
  type: 'DEFENSE' | 'STRIKE' | 'RECON';
  entityIds: number[];
}

export class AIArmyGroupManager {
  public update(sim: GameSimulation, bb: AIBlackboard): ArmySquad[] {
    const myUnits = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex && !e.isBuilding && e.maxOre === 0);

    const squads: ArmySquad[] = [
      { id: 'sq_defense', type: 'DEFENSE', entityIds: [] },
      { id: 'sq_strike', type: 'STRIKE', entityIds: [] },
      { id: 'sq_recon', type: 'RECON', entityIds: [] }
    ];

    // Assign first 2 units to defense, remaining to strike squad
    myUnits.forEach((unit, idx) => {
      if (idx < 2) {
        squads[0].entityIds.push(unit.id);
      } else {
        squads[1].entityIds.push(unit.id);
      }
    });

    return squads;
  }
}
