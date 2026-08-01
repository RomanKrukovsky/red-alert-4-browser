import { CommandType } from '@ra4/shared-types';
import { getFactionPlan } from './factionPlan.js';
export class AIBasePlanner {
    update(sim, bb) {
        const commands = [];
        const p = sim.players[bb.playerIndex];
        if (!p)
            return commands;
        const plan = getFactionPlan(bb.factionId);
        const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex);
        const myBuildings = myEntities.filter(e => e.isBuilding);
        const hasPower = myBuildings.some((building) => building.specId === plan.powerBuildingId);
        const hasRefinery = myBuildings.some((building) => building.specId === plan.refineryBuildingId);
        const hasBarracks = myBuildings.some((building) => building.specId === plan.barracksBuildingId);
        const hasFactory = myBuildings.some((building) => building.specId === plan.factoryBuildingId);
        const hasTech = myBuildings.some((building) => building.specId === plan.techBuildingId);
        const hasDefense = myBuildings.some((building) => building.specId === plan.defenseBuildingId);
        // Base Center (HQ position)
        const baseCenterX = bb.hqPosition ? Math.floor(bb.hqPosition.x / 1000) : 48;
        const baseCenterY = bb.hqPosition ? Math.floor(bb.hqPosition.y / 1000) : 48;
        // Helper: Find valid placement cell around base center
        const findPlacementGrid = (offsetX, offsetY) => {
            let bestX = baseCenterX + offsetX;
            let bestY = baseCenterY + offsetY;
            bestX = Math.max(5, Math.min(58, bestX));
            bestY = Math.max(5, Math.min(58, bestY));
            return { gridX: bestX, gridY: bestY };
        };
        // 1. Build Power Plant if power is low or not built
        if ((!hasPower || p.powerLow || p.powerProduced <= p.powerConsumed) && p.credits >= 800) {
            const pos = findPlacementGrid(-4, -4);
            commands.push({
                type: CommandType.BUILD_STRUCTURE,
                structureId: plan.powerBuildingId,
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
            const pos = findPlacementGrid(0, -6);
            commands.push({
                type: CommandType.BUILD_STRUCTURE,
                structureId: plan.refineryBuildingId,
                gridX: pos.gridX,
                gridY: pos.gridY,
                entityIds: [],
                playerIndex: bb.playerIndex,
                tick: sim.tickIndex
            });
            return commands;
        }
        // 3. Build Barracks (required by the vehicle factory)
        if (hasRefinery && !hasBarracks && p.credits >= 800) {
            const pos = findPlacementGrid(-6, 2);
            commands.push({
                type: CommandType.BUILD_STRUCTURE,
                structureId: plan.barracksBuildingId,
                gridX: pos.gridX,
                gridY: pos.gridY,
                entityIds: [],
                playerIndex: bb.playerIndex,
                tick: sim.tickIndex
            });
            return commands;
        }
        // 4. Build Heavy Factory
        if (hasRefinery && hasBarracks && !hasFactory && p.credits >= 2400) {
            const pos = findPlacementGrid(5, 2);
            commands.push({
                type: CommandType.BUILD_STRUCTURE,
                structureId: plan.factoryBuildingId,
                gridX: pos.gridX,
                gridY: pos.gridY,
                entityIds: [],
                playerIndex: bb.playerIndex,
                tick: sim.tickIndex
            });
            return commands;
        }
        // 5. Build tech/radar to unlock the main battle tank
        if (hasFactory && !hasTech && p.credits >= 1800) {
            const pos = findPlacementGrid(4, -5);
            commands.push({
                type: CommandType.BUILD_STRUCTURE,
                structureId: plan.techBuildingId,
                gridX: pos.gridX,
                gridY: pos.gridY,
                entityIds: [],
                playerIndex: bb.playerIndex,
                tick: sim.tickIndex
            });
            return commands;
        }
        // 6. Build Defense Structure
        if (hasFactory && hasTech && !hasDefense && p.credits >= 800) {
            const pos = findPlacementGrid(0, 6);
            commands.push({
                type: CommandType.BUILD_STRUCTURE,
                structureId: plan.defenseBuildingId,
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
//# sourceMappingURL=basePlanner.js.map