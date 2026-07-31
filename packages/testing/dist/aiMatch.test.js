import { GameSimulation } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';
console.log('Running Stage 7 Skirmish AI Opponent & Match Flow Tests...');
const sim = new GameSimulation(1337);
sim.initMatch([
    { name: 'Player 1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'AI Opponent', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
]);
// Run 1,200 ticks (40 seconds of full match simulation)
for (let t = 0; t < 1200; t++) {
    sim.step();
}
const aiEntities = Array.from(sim.entities.values()).filter(e => e.playerIndex === 1);
const aiBuildings = aiEntities.filter(e => e.isBuilding);
const aiUnits = aiEntities.filter(e => !e.isBuilding);
console.log(`AI Status after 1200 ticks: ${aiBuildings.length} buildings, ${aiUnits.length} units.`);
if (aiBuildings.length <= 1) {
    console.error('Test Failed: AI did not build additional structures!');
    process.exit(1);
}
console.log('SUCCESS! All Stage 7 Skirmish AI Opponent & Match Flow Tests passed cleanly.');
//# sourceMappingURL=aiMatch.test.js.map