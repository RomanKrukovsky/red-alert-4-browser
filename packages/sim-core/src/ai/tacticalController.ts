import { GameSimulation } from '../simulation.js';
import { PlayerCommand, CommandType } from '@ra4/shared-types';
import { AIBlackboard } from './aiBlackboard.js';
import { ArmySquad } from './armyGroupManager.js';

export class AITacticalController {
  public update(sim: GameSimulation, bb: AIBlackboard, squads: ArmySquad[]): PlayerCommand[] {
    const commands: PlayerCommand[] = [];

    const strikeSquad = squads.find(s => s.type === 'STRIKE');
    if (!strikeSquad || strikeSquad.entityIds.length < 4) return commands;

    // Determine target position from FOW Intel Memory
    const knownEnemies = Array.from(bb.intelEntries.values()).filter(e => e.certainty > 0.1);
    let targetX = 50000;
    let targetY = 50000;

    if (knownEnemies.length > 0) {
      // Prioritize enemy HQ or buildings
      const bldg = knownEnemies.find(e => e.isBuilding);
      if (bldg) {
        targetX = bldg.x;
        targetY = bldg.y;
      } else {
        targetX = knownEnemies[0].x;
        targetY = knownEnemies[0].y;
      }
    }

    commands.push({
      type: CommandType.ATTACK_MOVE,
      entityIds: [...strikeSquad.entityIds],
      targetX,
      targetY,
      playerIndex: bb.playerIndex,
      tick: sim.tickIndex
    });

    return commands;
  }
}
