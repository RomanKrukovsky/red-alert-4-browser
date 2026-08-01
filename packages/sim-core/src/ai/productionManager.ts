import { GameSimulation } from '../simulation.js';
import { PlayerCommand, CommandType, FactionId } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { AIBlackboard } from './aiBlackboard.js';

export class AIProductionManager {
  public update(sim: GameSimulation, bb: AIBlackboard): PlayerCommand[] {
    const commands: PlayerCommand[] = [];
    const p = sim.players[bb.playerIndex];
    if (!p) return commands;

    const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex);
    const myBuildings = myEntities.filter(e => e.isBuilding);
    const barracks = myBuildings.filter(b => b.specId.includes('Barracks'));
    const factories = myBuildings.filter(b => b.specId.includes('Factory') || b.specId.includes('Works'));
    const hasTech = myBuildings.some(b => b.specId.includes('Radar') || b.specId.includes('Intel'));

    if (barracks.length === 0 && factories.length === 0) return commands;

    // Analyze visible enemy targets from FOW memory
    const enemyTargets = Array.from(bb.intelEntries.values());
    const enemyTanks = enemyTargets.filter(e => !e.isBuilding && (e.specId.includes('MBT') || e.specId.includes('Tank') || e.specId.includes('Bulwark') || e.specId.includes('Granit')));

    for (const infantryProducer of barracks) {
      if (infantryProducer.productionQueue.length >= 2) continue;

      const unitId = enemyTanks.length > 0
        ? (bb.factionId === FactionId.ALLIANCE ? 'AL_LancerTeam' : 'SU_ZaslonAATeam')
        : (bb.factionId === FactionId.ALLIANCE ? 'AL_SentinelRifleman' : 'SU_RubezhRifleman');
      const cost = DEFAULT_DATABASE.units.find(unit => unit.id === unitId)?.cost;
      if (cost !== undefined && p.credits >= cost) {
        commands.push({
          type: CommandType.PRODUCE_UNIT,
          producerEntityId: infantryProducer.id,
          unitId,
          entityIds: [],
          playerIndex: bb.playerIndex,
          tick: sim.tickIndex
        });
      }
    }

    for (const factory of factories) {
      if (factory.productionQueue.length >= 2) continue;

      let unitId = hasTech
        ? (bb.factionId === FactionId.ALLIANCE ? 'AL_BulwarkMBT' : 'SU_GranitMBT')
        : (bb.factionId === FactionId.ALLIANCE ? 'AL_KestrelScout' : 'SU_RysScout');

      if (hasTech && enemyTanks.length === 0 && sim.prng.nextRange(1, 100) > 70) {
        unitId = bb.factionId === FactionId.ALLIANCE ? 'AL_KestrelScout' : 'SU_RysScout';
      }

      const cost = DEFAULT_DATABASE.units.find(unit => unit.id === unitId)?.cost;
      if (cost !== undefined && p.credits >= cost) {
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
