export class AIDirector {
    update(sim, bb) {
        const p = sim.players[bb.playerIndex];
        if (!p)
            return;
        bb.credits = p.credits;
        bb.powerProduced = p.powerProduced;
        bb.powerConsumed = p.powerConsumed;
        bb.isPowerLow = p.powerLow;
        const myEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === bb.playerIndex);
        const myBuildings = myEntities.filter(e => e.isBuilding);
        const myHarvesters = myEntities.filter(e => !e.isBuilding && e.maxOre > 0);
        const myCombatUnits = myEntities.filter(e => !e.isBuilding && e.maxOre === 0);
        bb.harvesterCount = myHarvesters.length;
        // Set HQ position
        const hq = myBuildings.find(b => b.specId.includes('HQ') || b.specId.includes('Base') || b.specId.includes('Thermal') || b.specId.includes('Reactor'));
        if (hq) {
            bb.hqPosition = { x: hq.x, y: hq.y };
        }
        // Phase Transitions
        if (bb.harvesterCount === 0 && sim.tickIndex > 300) {
            bb.currentPhase = 'RECOVERY';
        }
        else if (myCombatUnits.length >= 6) {
            bb.currentPhase = 'PRESSURE';
        }
        else if (myBuildings.length >= 4) {
            bb.currentPhase = 'MIDGAME';
        }
        else if (myBuildings.length >= 2) {
            bb.currentPhase = 'EXPANSION';
        }
        else {
            bb.currentPhase = 'OPENING';
        }
    }
}
//# sourceMappingURL=aiDirector.js.map