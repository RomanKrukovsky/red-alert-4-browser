import { CommandType, FactionId } from '@ra4/shared-types';
export class SuperweaponManager {
    superweaponStates = new Map();
    initPlayerSuperweapons(playerIndex, factionId) {
        const swList = [];
        if (factionId === FactionId.USSR) {
            swList.push({ id: 'sw_iron_curtain', name: 'Железный Занавес', factionId, cooldownTicksTotal: 3600, cooldownTicksRemaining: 0, isReady: true });
        }
        else if (factionId === FactionId.ALLIANCE) {
            swList.push({ id: 'sw_chronosphere', name: 'Хроносфера', factionId, cooldownTicksTotal: 3600, cooldownTicksRemaining: 0, isReady: true });
        }
        else if (factionId === FactionId.ORIENTAL_COALITION) {
            swList.push({ id: 'sw_solar_array', name: 'Орбитальный Солнечный Луч', factionId, cooldownTicksTotal: 4500, cooldownTicksRemaining: 0, isReady: true });
        }
        else if (factionId === FactionId.CHRONOLEGION) {
            swList.push({ id: 'sw_temporal_rift', name: 'Временной Разлом', factionId, cooldownTicksTotal: 4500, cooldownTicksRemaining: 0, isReady: true });
        }
        this.superweaponStates.set(playerIndex, swList);
    }
    update(sim) {
        for (const [pIdx, swList] of this.superweaponStates.entries()) {
            for (const sw of swList) {
                if (sw.cooldownTicksRemaining > 0) {
                    sw.cooldownTicksRemaining--;
                    if (sw.cooldownTicksRemaining === 0) {
                        sw.isReady = true;
                    }
                }
            }
        }
    }
    executeSuperweaponCommand(sim, cmd) {
        if (cmd.type !== CommandType.USE_ABILITY || !cmd.abilityId)
            return false;
        const playerSWs = this.superweaponStates.get(cmd.playerIndex);
        if (!playerSWs)
            return false;
        const sw = playerSWs.find(s => s.id === cmd.abilityId);
        if (!sw || !sw.isReady)
            return false;
        const tx = cmd.targetX ?? 32000;
        const ty = cmd.targetY ?? 32000;
        switch (sw.id) {
            case 'sw_iron_curtain': {
                // Grant 15s invulnerability to units in 10m radius
                for (const e of sim.entities.values()) {
                    if (e.playerIndex === cmd.playerIndex && !e.isBuilding) {
                        const dx = e.x - tx;
                        const dy = e.y - ty;
                        if (dx * dx + dy * dy <= 100000000) {
                            e.shield = e.maxShield = 10000; // Invulnerability shield buffer
                        }
                    }
                }
                break;
            }
            case 'sw_chronosphere': {
                // Teleport targeted units to target coordinates
                const targets = cmd.entityIds.map(id => sim.entities.get(id)).filter((e) => !!e && e.playerIndex === cmd.playerIndex);
                targets.forEach((e, idx) => {
                    e.x = tx + (idx % 3) * 2000;
                    e.y = ty + Math.floor(idx / 3) * 2000;
                    e.waypoints = undefined;
                    e.targetX = undefined;
                    e.targetY = undefined;
                });
                break;
            }
            case 'sw_solar_array': {
                // Deal 2500 damage to enemies in 12m radius
                for (const e of sim.entities.values()) {
                    if (e.playerIndex !== cmd.playerIndex) {
                        const dx = e.x - tx;
                        const dy = e.y - ty;
                        if (dx * dx + dy * dy <= 144000000) {
                            e.hp = Math.max(0, e.hp - 2500);
                            if (e.hp === 0) {
                                sim.removeEntity(e.id);
                            }
                        }
                    }
                }
                break;
            }
            case 'sw_temporal_rift': {
                // Freeze enemies in 15m radius for 20 seconds
                for (const e of sim.entities.values()) {
                    if (e.playerIndex !== cmd.playerIndex) {
                        const dx = e.x - tx;
                        const dy = e.y - ty;
                        if (dx * dx + dy * dy <= 225000000) {
                            e.isDisabled = true;
                            e.disabledTicksRemaining = 600;
                        }
                    }
                }
                break;
            }
            default:
                return false;
        }
        // Reset cooldown
        sw.isReady = false;
        sw.cooldownTicksRemaining = sw.cooldownTicksTotal;
        return true;
    }
}
//# sourceMappingURL=superweaponManager.js.map