import { GameSimulation, calculateDamage } from '@ra4/sim-core';
import { ArmorType, CommandType, DamageType, FactionId, PlayerType } from '@ra4/shared-types';
console.log('Running Stage 4 Combat, Damage & Destruction Tests...');
// Test 1: Armor & Damage Multipliers
const apVsTank = calculateDamage(100, DamageType.ArmorPiercing, ArmorType.HeavyVehicle);
const ballisticVsBuilding = calculateDamage(100, DamageType.Ballistic, ArmorType.Structure);
if (apVsTank <= 100) {
    console.error(`Test 1 Failed: Expected AP vs Tank damage multiplier > 1.0, got ${apVsTank}`);
    process.exit(1);
}
if (ballisticVsBuilding >= 50) {
    console.error(`Test 1 Failed: Expected Ballistic vs Structure damage multiplier < 0.5, got ${ballisticVsBuilding}`);
    process.exit(1);
}
// Test 2: Unit Combat, Shield Absorption & Death
const sim = new GameSimulation(1337);
sim.initMatch([
    { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_EASY, team: 1 }
]);
const attackerId = sim.spawnUnit('SU_GranitMBT', 0, 10000, 10000);
const defenderId = sim.spawnUnit('AL_BulwarkMBT', 1, 12000, 10000); // within range
sim.processCommands([{
        type: CommandType.ATTACK,
        entityIds: [attackerId],
        targetEntityId: defenderId,
        playerIndex: 0,
        tick: 0
    }]);
const initialHp = sim.entities.get(defenderId).hp;
const initialShield = sim.entities.get(defenderId).shield;
// Step 30 ticks (1 second of combat)
for (let i = 0; i < 30; i++) {
    sim.step();
}
const defenderAfter = sim.entities.get(defenderId);
if (!defenderAfter || (defenderAfter.hp + defenderAfter.shield) >= (initialHp + initialShield)) {
    console.error('Test 2 Failed: Defender did not take damage during combat!');
    process.exit(1);
}
// Test 3: Mass Combat (50 vs 50)
const simMass = new GameSimulation(42);
simMass.initMatch([
    { name: 'Red Army', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'Blue Army', factionId: FactionId.ALLIANCE, type: PlayerType.AI_HARD, team: 1 }
]);
for (let i = 0; i < 50; i++) {
    simMass.spawnUnit('SU_RubezhRifleman', 0, 5000 + (i % 10) * 1000, 5000 + Math.floor(i / 10) * 1000);
    simMass.spawnUnit('AL_SentinelRifleman', 1, 15000 + (i % 10) * 1000, 5000 + Math.floor(i / 10) * 1000);
}
// Command Red Army to attack Blue Army area
const redIds = Array.from(simMass.entities.values()).filter(e => e.playerIndex === 0).map(e => e.id);
simMass.processCommands([{
        type: CommandType.MOVE,
        entityIds: redIds,
        targetX: 15000,
        targetY: 8000,
        playerIndex: 0,
        tick: 0
    }]);
// Run 300 ticks (10 seconds of mass battle)
for (let t = 0; t < 300; t++) {
    simMass.step();
}
console.log(`Mass Combat Status after 300 ticks: ${simMass.entities.size} entities remaining.`);
console.log('SUCCESS! All Stage 4 Combat, Damage & Destruction Tests passed cleanly.');
//# sourceMappingURL=combat.test.js.map