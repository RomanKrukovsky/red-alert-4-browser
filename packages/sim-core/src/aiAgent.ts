import { GameSimulation } from './simulation.js';
import { CommandType, PlayerCommand } from '@ra4/shared-types';

export class SkirmishAIAgent {
  public playerIndex: number;
  private evalIntervalTicks: number = 30; // evaluates strategic decisions once every 30 ticks (1s)

  constructor(playerIndex: number) {
    this.playerIndex = playerIndex;
  }

  public update(sim: GameSimulation): PlayerCommand[] {
    if (sim.tickIndex % this.evalIntervalTicks !== 0) return [];

    const commands: PlayerCommand[] = [];
    const p = sim.players[this.playerIndex];
    if (!p || !p.hasHQ) return commands;

    const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === this.playerIndex);
    const myBuildings = myEntities.filter(e => e.isBuilding);
    const myUnits = myEntities.filter(e => !e.isBuilding && e.maxOre === 0);
    const myHarvesters = myEntities.filter(e => !e.isBuilding && e.maxOre > 0);

    const hasRefinery = myBuildings.some(b => b.specId.includes('Refinery'));
    const hasPower = myBuildings.some(b => b.specId.includes('Power') || b.specId.includes('Reactor'));
    const hasFactory = myBuildings.some(b => b.specId.includes('Factory') || b.specId.includes('Works'));

    // 1. Power Priority
    if (p.powerLow || p.powerProduced <= p.powerConsumed) {
      if (p.credits >= 800) {
        const pwrId = this.playerIndex === 1 ? 'AL_FissionReactor' : 'SU_ThermalPower';
        commands.push({
          type: CommandType.BUILD_STRUCTURE,
          structureId: pwrId,
          gridX: 45,
          gridY: 45,
          entityIds: [],
          playerIndex: this.playerIndex,
          tick: sim.tickIndex
        });
        return commands;
      }
    }

    // 2. Economy Priority (Harvesters & Refinery)
    if (!hasRefinery && p.credits >= 2000) {
      const refId = this.playerIndex === 1 ? 'AL_RefiningComplex' : 'SU_OreRefinery';
      commands.push({
        type: CommandType.BUILD_STRUCTURE,
        structureId: refId,
        gridX: 48,
        gridY: 42,
        entityIds: [],
        playerIndex: this.playerIndex,
        tick: sim.tickIndex
      });
      return commands;
    }

    // 3. Factory Expansion
    if (hasRefinery && !hasFactory && p.credits >= 2000) {
      const facId = this.playerIndex === 1 ? 'AL_ArmorWorks' : 'SU_HeavyFactory';
      commands.push({
        type: CommandType.BUILD_STRUCTURE,
        structureId: facId,
        gridX: 52,
        gridY: 48,
        entityIds: [],
        playerIndex: this.playerIndex,
        tick: sim.tickIndex
      });
      return commands;
    }

    // 4. Army Recruitment
    if (hasFactory) {
      const factory = myBuildings.find(b => b.specId.includes('Factory') || b.specId.includes('Works'));
      if (factory && factory.productionQueue.length < 2) {
        const unitId = this.playerIndex === 1 ? 'AL_BulwarkMBT' : 'SU_GranitMBT';
        const cost = 1200;
        if (p.credits >= cost) {
          commands.push({
            type: CommandType.PRODUCE_UNIT,
            producerEntityId: factory.id,
            unitId,
            entityIds: [],
            playerIndex: this.playerIndex,
            tick: sim.tickIndex
          });
        }
      }
    }

    // 5. Attack Wave Dispatch
    if (myUnits.length >= 3) {
      const armyIds = myUnits.map(u => u.id);
      // Find human player HQ position
      const enemyHq = Array.from(sim.entities.values()).find(e => e.playerIndex !== this.playerIndex && e.isBuilding);
      const targetX = enemyHq ? enemyHq.x : 10000;
      const targetY = enemyHq ? enemyHq.y : 10000;

      commands.push({
        type: CommandType.MOVE,
        entityIds: armyIds,
        targetX,
        targetY,
        playerIndex: this.playerIndex,
        tick: sim.tickIndex
      });
    }

    return commands;
  }
}
