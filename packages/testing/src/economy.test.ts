import { GameSimulation } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';

console.log('Running Stage 5 Resource & Economy Loop Tests...');

const sim = new GameSimulation(1337);
sim.initMatch([
  { name: 'Player 1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 }
]);

const initialCredits = sim.players[0].credits;

// Find harvester & refinery spawned in initMatch
let harvester = Array.from(sim.entities.values()).find(e => e.maxOre > 0);
let refinery = Array.from(sim.entities.values()).find(e => e.specId === 'SU_OreRefinery');

if (!harvester) {
  const harvesterId = sim.spawnUnit('SU_BogatyrOreCarrier', 0, 10000, 10000);
  harvester = sim.entities.get(harvesterId);
}

if (!refinery) {
  const refineryId = sim.spawnBuilding('SU_OreRefinery', 0, 8000, 8000);
  refinery = sim.entities.get(refineryId);
}

// Run 600 ticks (20 seconds of economy loop)
for (let t = 0; t < 600; t++) {
  sim.step();
}

const finalCredits = sim.players[0].credits;
console.log(`Initial Credits: ${initialCredits}, Final Credits after 600 ticks: ${finalCredits}`);

if (finalCredits <= initialCredits) {
  console.error('Test Failed: Harvester did not generate credits!');
  process.exit(1);
}

console.log('SUCCESS! All Stage 5 Resource & Economy Loop Tests passed cleanly.');
