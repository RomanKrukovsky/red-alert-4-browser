import { GameSimulation } from '../simulation.js';
import { PlayerCommand, CommandType, FactionId } from '@ra4/shared-types';
import { AIBlackboard } from './aiBlackboard.js';

export class AIBasePlanner {
  public update(sim: GameSimulation, bb: AIBlackboard): PlayerCommand[] {
    const commands: PlayerCommand[] = [];
    const p = sim.players[bb.playerIndex];
    if (!p) return commands;

    const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex);
    const myBuildings = myEntities.filter(e => e.isBuilding);

    const hasPower = myBuildings.some(b => b.specId.includes('Power') || b.specId.includes('Reactor'));
    const hasRefinery = myBuildings.some(b => b.specId.includes('Refinery') || b.specId.includes('Refining'));
    const hasFactory = myBuildings.some(b => b.specId.includes('Factory') || b.specId.includes('Works'));
    const hasDefense = myBuildings.some(b => b.specId.includes('Pillbox') || b.specId.includes('Turret'));

    // Base Center (HQ position)
    const baseCenterX = bb.hqPosition ? Math.floor(bb.hqPosition.x / 1000) : 48;
    const baseCenterY = bb.hqPosition ? Math.floor(bb.hqPosition.y / 1000) : 48;

    // Helper: Find valid placement cell around base center
    const findPlacementGrid = (offsetX: number, offsetY: number) => {
      let bestX = baseCenterX + offsetX;
      let bestY = baseCenterY + offsetY;
      bestX = Math.max(5, Math.min(58, bestX));
      bestY = Math.max(5, Math.min(58, bestY));
      return { gridX: bestX, gridY: bestY };
    };

    // 1. Build Power Plant if power is low or not built
    if ((!hasPower || p.powerLow || p.powerProduced <= p.powerConsumed) && p.credits >= 800) {
      const pwrId = bb.factionId === FactionId.ALLIANCE ? 'AL_FissionReactor' : 'SU_ThermalPower';
      const pos = findPlacementGrid(-4, -4);
      commands.push({
        type: CommandType.BUILD_STRUCTURE,
        structureId: pwrId,
        gridX: pos.gridX,
        gridY: pos.gridY,
        entityIds: [],
        playerIndex: bb.playerIndex,
        tick: sim.tickIndex
      });
      return commands;
    }

    // 2. Build Ore Refinery
    if (!hasRefinery && p.credits >= 2000) {
      const refId = bb.factionId === FactionId.ALLIANCE ? 'AL_RefiningComplex' : 'SU_OreRefinery';
      const pos = findPlacementGrid(0, -6);
      commands.push({
        type: CommandType.BUILD_STRUCTURE,
        structureId: refId,
        gridX: pos.gridX,
        gridY: pos.gridY,
        entityIds: [],
        playerIndex: bb.playerIndex,
        tick: sim.tickIndex
      });
      return commands;
    }

    // 3. Build Heavy Factory
    if (hasRefinery && !hasFactory && p.credits >= 2000) {
      const facId = bb.factionId === FactionId.ALLIANCE ? 'AL_ArmorWorks' : 'SU_HeavyFactory';
      const pos = findPlacementGrid(6, 0);
      commands.push({
        type: CommandType.BUILD_STRUCTURE,
        structureId: facId,
        gridX: pos.gridX,
        gridY: pos.gridY,
        entityIds: [],
        playerIndex: bb.playerIndex,
        tick: sim.tickIndex
      });
      return commands;
    }

    // 4. Build Defense Structure (Pillbox)
    if (hasFactory && !hasDefense && p.credits >= 1000) {
      const defId = bb.factionId === FactionId.ALLIANCE ? 'AL_Pillbox' : 'SU_Pillbox';
      const pos = findPlacementGrid(0, 6);
      commands.push({
        type: CommandType.BUILD_STRUCTURE,
        structureId: defId,
        gridX: pos.gridX,
        gridY: pos.gridY,
        entityIds: [],
        playerIndex: bb.playerIndex,
        tick: sim.tickIndex
      });
      return commands;
    }

    return commands;
  }
}
