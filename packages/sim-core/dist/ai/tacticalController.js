import { CommandType } from '@ra4/shared-types';
export class AITacticalController {
    update(sim, bb, squads) {
        const commands = [];
        const strikeSquad = squads.find(s => s.type === 'STRIKE');
        if (!strikeSquad || strikeSquad.entityIds.length < 4)
            return commands;
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
            }
            else {
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
//# sourceMappingURL=tacticalController.js.map