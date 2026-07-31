import { GameSimulation } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';
console.log('Running 10,000-Tick Headless Determinism Test...');
const seed = 424242;
const playerConfigs = [
    { name: 'Player 1 (USSR)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'Player 2 (Alliance)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
];
const sim1 = new GameSimulation(seed);
sim1.initMatch(playerConfigs);
const sim2 = new GameSimulation(seed);
sim2.initMatch(playerConfigs);
let mismatchCount = 0;
const totalTicks = 10000;
for (let i = 0; i < totalTicks; i++) {
    const snap1 = sim1.step();
    const snap2 = sim2.step();
    if (snap1.checksum !== snap2.checksum) {
        console.error(`DESYNC DETECTED AT TICK ${i}! Checksum1: ${snap1.checksum}, Checksum2: ${snap2.checksum}`);
        mismatchCount++;
        break;
    }
}
if (mismatchCount === 0) {
    console.log(`SUCCESS! 100% Deterministic match over ${totalTicks} ticks. Final Checksum: ${sim1.calculateChecksum()}`);
}
else {
    process.exit(1);
}
//# sourceMappingURL=determinismRunner.js.map