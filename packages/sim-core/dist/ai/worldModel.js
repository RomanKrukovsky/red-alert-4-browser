export class AIWorldModel {
    update(sim, bb) {
        const fow = sim.fogOfWar;
        // Decay existing memory certainty
        for (const [id, entry] of bb.intelEntries.entries()) {
            entry.certainty = Math.max(0, entry.certainty - 0.005);
            if (entry.certainty <= 0) {
                bb.intelEntries.delete(id);
            }
        }
        // Update own HQ position from live entity state
        for (const entity of sim.entities.values()) {
            if (entity.playerIndex === bb.playerIndex && entity.isBuilding && entity.specId.toUpperCase().includes('HQ')) {
                bb.hqPosition = { x: entity.x, y: entity.y };
                break;
            }
        }
        // Inspect entities in vision
        for (const entity of sim.entities.values()) {
            if (entity.playerIndex === bb.playerIndex)
                continue; // Skip own entities
            const wx = entity.x / 1000;
            const wz = entity.y / 1000;
            // FOW Compliance Check
            if (fow.isVisible(bb.team, Math.floor(wx), Math.floor(wz))) {
                bb.intelEntries.set(entity.id, {
                    entityId: entity.id,
                    specId: entity.specId,
                    isBuilding: entity.isBuilding,
                    x: entity.x,
                    y: entity.y,
                    lastSeenTick: sim.tickIndex,
                    certainty: 1.0,
                    healthPercentage: entity.hp / entity.maxHp,
                    playerIndex: entity.playerIndex
                });
            }
        }
        // Update Threat Grid (32x32 spatial cells)
        for (let r = 0; r < 32; r++) {
            for (let c = 0; c < 32; c++) {
                bb.threatGrid[r][c] = 0;
            }
        }
        for (const intel of bb.intelEntries.values()) {
            if (intel.certainty < 0.2)
                continue;
            const gx = Math.min(31, Math.max(0, Math.floor(intel.x / 2000)));
            const gz = Math.min(31, Math.max(0, Math.floor(intel.y / 2000)));
            // Add threat score based on entity type
            const threatScore = intel.isBuilding ? 2 : 5;
            bb.threatGrid[gz][gx] += threatScore * intel.certainty;
        }
    }
    getKnownEnemyTargets(bb) {
        return Array.from(bb.intelEntries.values()).filter(e => e.certainty > 0.1);
    }
    getKnownEnemyHQ(bb) {
        const hqs = Array.from(bb.intelEntries.values()).filter(e => e.isBuilding && (e.specId.includes('HQ') || e.specId.includes('Base') || e.specId.includes('Construction')));
        if (hqs.length === 0)
            return null;
        hqs.sort((a, b) => b.certainty - a.certainty);
        return hqs[0];
    }
}
//# sourceMappingURL=worldModel.js.map