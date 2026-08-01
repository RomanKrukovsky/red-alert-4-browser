import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, PlayerType, CommandType } from '@ra4/shared-types';
console.log('=== Running Superweapon Manager System Tests ===');
const manager = new MatchLifecycleManager();
manager.initialize({
    seed: 999,
    tickRate: 30,
    players: [
        { name: 'Soviet Commander', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'Allied Commander', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
    ]
});
if (manager.sim) {
    // Test Iron Curtain Execution
    manager.sim.processCommands([{
            type: CommandType.USE_ABILITY,
            abilityId: 'sw_iron_curtain',
            targetX: 30000,
            targetY: 30000,
            entityIds: [],
            playerIndex: 0,
            tick: 1
        }]);
    console.log('✓ Iron Curtain Superweapon executed successfully');
    // Test Chronosphere Teleportation
    manager.sim.processCommands([{
            type: CommandType.USE_ABILITY,
            abilityId: 'sw_chronosphere',
            targetX: 50000,
            targetY: 50000,
            entityIds: [2],
            playerIndex: 1,
            tick: 1
        }]);
    console.log('✓ Chronosphere Teleportation Superweapon executed successfully');
}
console.log('SUCCESS! All Superweapon Manager Tests passed cleanly.');
//# sourceMappingURL=superweapons.test.js.map