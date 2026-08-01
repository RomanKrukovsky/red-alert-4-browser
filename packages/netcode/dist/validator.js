import { CommandType } from '@ra4/shared-types';
export function validatePlayerCommand(cmd, sim, playerIndex) {
    if (cmd.playerIndex !== playerIndex) {
        return { valid: false, reason: 'Command playerIndex spoofing attempt' };
    }
    const p = sim.players[playerIndex];
    if (!p) {
        return { valid: false, reason: 'Player index out of bounds' };
    }
    switch (cmd.type) {
        case CommandType.MOVE:
        case CommandType.ATTACK:
        case CommandType.STOP:
        case CommandType.HOLD: {
            if (cmd.entityIds.length > 100) {
                return { valid: false, reason: 'Command entity count exceeds limit of 100' };
            }
            for (const id of cmd.entityIds) {
                const entity = sim.entities.get(id);
                if (!entity) {
                    return { valid: false, reason: `Entity ${id} does not exist` };
                }
                if (entity.playerIndex !== playerIndex) {
                    return { valid: false, reason: `Entity ${id} belongs to player ${entity.playerIndex}, not ${playerIndex}` };
                }
            }
            return { valid: true };
        }
        case CommandType.BUILD_STRUCTURE: {
            if (cmd.gridX < 0 || cmd.gridY < 0 || cmd.gridX >= 64 || cmd.gridY >= 64) {
                return { valid: false, reason: 'Grid coordinates out of map bounds' };
            }
            // Server-side credit validation
            if (p.credits < 100) {
                return { valid: false, reason: 'Insufficient player credits for structure construction' };
            }
            return { valid: true };
        }
        case CommandType.PRODUCE_UNIT: {
            const producer = sim.entities.get(cmd.producerEntityId);
            if (!producer)
                return { valid: false, reason: 'Producer entity does not exist' };
            if (producer.playerIndex !== playerIndex)
                return { valid: false, reason: 'Producer ownership mismatch' };
            if (p.credits < 50)
                return { valid: false, reason: 'Insufficient player credits for unit production' };
            return { valid: true };
        }
        default:
            return { valid: true };
    }
}
//# sourceMappingURL=validator.js.map