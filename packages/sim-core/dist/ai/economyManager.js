import { CommandType } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { getFactionPlan } from './factionPlan.js';
export class AIEconomyManager {
    update(sim, bb) {
        const commands = [];
        const p = sim.players[bb.playerIndex];
        if (!p)
            return commands;
        const plan = getFactionPlan(bb.factionId);
        const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex);
        const myBuildings = myEntities.filter(e => e.isBuilding);
        const myHarvesters = myEntities.filter(e => !e.isBuilding && e.maxOre > 0);
        const factories = myBuildings.filter((building) => building.specId === plan.factoryBuildingId);
        // Harvester Replacement Logic
        if (myHarvesters.length < bb.targetHarvesterCount && factories.length > 0) {
            const factory = factories[0];
            if (factory.productionQueue.length < 2) {
                const harvesterSpec = plan.harvesterUnitId;
                const harvesterCost = DEFAULT_DATABASE.units.find(unit => unit.id === harvesterSpec)?.cost;
                if (harvesterCost !== undefined && p.credits >= harvesterCost) {
                    commands.push({
                        type: CommandType.PRODUCE_UNIT,
                        producerEntityId: factory.id,
                        unitId: harvesterSpec,
                        entityIds: [],
                        playerIndex: bb.playerIndex,
                        tick: sim.tickIndex
                    });
                }
            }
        }
        // Auto-Gather Command for Idle Harvesters
        for (const h of myHarvesters) {
            // Find nearest ore node from sim.resourceNodes
            const oreNodes = Array.from(sim.resourceNodes.values()).filter(node => node.creditsRemaining > 0);
            if (oreNodes.length > 0) {
                let closest = oreNodes[0];
                let minDist = Infinity;
                for (const node of oreNodes) {
                    const dx = node.x - h.x;
                    const dy = node.y - h.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        closest = node;
                    }
                }
                // Only command if further than 3000 units
                if (minDist > 9000000) {
                    commands.push({
                        type: CommandType.GATHER,
                        entityIds: [h.id],
                        resourceNodeId: closest.id,
                        playerIndex: bb.playerIndex,
                        tick: sim.tickIndex
                    });
                }
            }
        }
        return commands;
    }
}
//# sourceMappingURL=economyManager.js.map