import { CommandType } from '@ra4/shared-types';
import { getPersonalityProfile } from './aiPersonalities.js';
export class AITacticalController {
    update(sim, bb, squads) {
        const commands = [];
        const profile = getPersonalityProfile(bb);
        const reconSquad = squads.find(s => s.type === 'RECON');
        if (reconSquad && reconSquad.entityIds.length > 0) {
            const idleReconIds = reconSquad.entityIds.filter(entityId => {
                const entity = sim.entities.get(entityId);
                return entity && entity.targetX === undefined && entity.targetEntityId === undefined;
            });
            if (idleReconIds.length > 0) {
                // Map-relative scout circuit: center + four quadrant expansions.
                const w = sim.mapWidth * 1000;
                const h = sim.mapHeight * 1000;
                const scoutWaypoints = [
                    { x: Math.floor(w / 2), y: Math.floor(h / 2) },
                    { x: Math.floor(w * 0.19), y: Math.floor(h * 0.81) },
                    { x: Math.floor(w * 0.81), y: Math.floor(h * 0.19) },
                    { x: Math.floor(w * 0.81), y: Math.floor(h * 0.81) },
                    { x: Math.floor(w * 0.19), y: Math.floor(h * 0.19) }
                ];
                const waypointIndex = (Math.floor(sim.tickIndex / 300) + idleReconIds[0]) % scoutWaypoints.length;
                const waypoint = scoutWaypoints[waypointIndex];
                commands.push({
                    type: CommandType.MOVE,
                    entityIds: idleReconIds,
                    targetX: waypoint.x,
                    targetY: waypoint.y,
                    playerIndex: bb.playerIndex,
                    tick: sim.tickIndex
                });
            }
        }
        const strikeSquad = squads.find(s => s.type === 'STRIKE');
        if (!strikeSquad || strikeSquad.entityIds.length < profile.strikeThreshold)
            return commands;
        // Determine target position from FOW Intel Memory
        const knownEnemies = Array.from(bb.intelEntries.values()).filter(e => e.certainty > 0.1);
        if (knownEnemies.length === 0)
            return commands;
        knownEnemies.sort((a, b) => {
            if (a.isBuilding !== b.isBuilding)
                return a.isBuilding ? -1 : 1;
            if (a.certainty !== b.certainty)
                return b.certainty - a.certainty;
            return a.entityId - b.entityId;
        });
        const targetX = knownEnemies[0].x;
        const targetY = knownEnemies[0].y;
        const idleStrikeIds = strikeSquad.entityIds.filter(entityId => {
            const entity = sim.entities.get(entityId);
            return entity && entity.targetX === undefined && entity.targetEntityId === undefined;
        });
        if (idleStrikeIds.length !== strikeSquad.entityIds.length)
            return commands;
        commands.push({
            type: CommandType.ATTACK_MOVE,
            entityIds: idleStrikeIds,
            targetX,
            targetY,
            playerIndex: bb.playerIndex,
            tick: sim.tickIndex
        });
        return commands;
    }
}
//# sourceMappingURL=tacticalController.js.map