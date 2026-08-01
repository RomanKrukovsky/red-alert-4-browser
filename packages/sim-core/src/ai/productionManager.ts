import { GameSimulation } from '../simulation.js';
import { PlayerCommand, CommandType, FactionId } from '@ra4/shared-types';
import { AIBlackboard } from './aiBlackboard.js';

export class AIProductionManager {
  public update(sim: GameSimulation, bb: AIBlackboard): PlayerCommand[] {
    const commands: PlayerCommand[] = [];
    const p = sim.players[bb.playerIndex];
    if (!p) return commands;

    const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex);
    const myBuildings = myEntities.filter(e => e.isBuilding);
    const factories = myBuildings.filter(b => b.specId.includes('Factory') || b.specId.includes('Works'));

    if (factories.length === 0) return commands;

    // Analyze visible enemy targets from FOW memory
    const enemyTargets = Array.from(bb.intelEntries.values());
    const enemyTanks = enemyTargets.filter(e => !e.isBuilding && (e.specId.includes('MBT') || e.specId.includes('Tank') || e.specId.includes('Bulwark') || e.specId.includes('Granit')));

    for (const factory of factories) {
      if (factory.productionQueue.length >= 2) continue;

      // Decision logic: if enemy has tanks, produce MBT; else mix MBT and Riflemen
      let unitId = bb.factionId === FactionId.ALLIANCE ? 'AL_BulwarkMBT' : 'SU_GranitMBT';
      let cost = 1200;

      if (enemyTanks.length === 0 && sim.prng.nextRange(1, 100) > 60) {
        unitId = 'SU_RubezhRifleman';
        cost = 400;
      }

      if (p.credits >= cost) {
        commands.push({
          type: CommandType.PRODUCE_UNIT,
          producerEntityId: factory.id,
          unitId,
          entityIds: [],
          playerIndex: bb.playerIndex,
          tick: sim.tickIndex
        });
      }
    }

    return commands;
  }
}
