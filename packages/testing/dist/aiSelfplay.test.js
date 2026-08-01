import { GameSimulation } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';
console.log('Running AI Selfplay Tests...');
function testAIVsAIRuns1000Ticks() {
    console.log('Test: AI vs AI runs 1000 ticks without crashing');
    const sim = new GameSimulation(1001);
    sim.initMatch([
        { name: 'USSR', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
        { name: 'ALLIANCE', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
    ]);
    for (let i = 0; i < 1000; i++) {
        sim.step();
    }
    console.log('Passed: AI vs AI runs 1000 ticks without crashing');
}
function testDeterminism() {
    console.log('Test: Checksum determinism with same seed');
    const seed = 42;
    const playerConfigs = [
        { name: 'USSR', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
        { name: 'ALLIANCE', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
    ];
    const sim1 = new GameSimulation(seed);
    sim1.initMatch(playerConfigs);
    const sim2 = new GameSimulation(seed);
    sim2.initMatch(playerConfigs);
    for (let i = 0; i < 500; i++) {
        const snap1 = sim1.step();
        const snap2 = sim2.step();
        if (snap1.checksum !== snap2.checksum) {
            console.error(`DESYNC DETECTED AT TICK ${i}! Checksum1: ${snap1.checksum}, Checksum2: ${snap2.checksum}`);
            process.exit(1);
        }
    }
    console.log('Passed: Checksum determinism with same seed');
}
function testAIProducesUnits() {
    console.log('Test: AI produces units within 300 ticks');
    const sim = new GameSimulation(2002);
    sim.initMatch([
        { name: 'USSR', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
        { name: 'ALLIANCE', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
    ]);
    const initialEntitiesCount = sim.entities.size;
    for (let i = 0; i < 300; i++) {
        sim.step();
    }
    if (sim.entities.size <= initialEntitiesCount) {
        console.error(`Test Failed: AI did not produce any units! Initial: ${initialEntitiesCount}, Final: ${sim.entities.size}`);
        process.exit(1);
    }
    console.log('Passed: AI produces units within 300 ticks');
}
try {
    testAIVsAIRuns1000Ticks();
    testDeterminism();
    testAIProducesUnits();
    console.log('SUCCESS! All AI Selfplay Tests passed cleanly.');
}
catch (error) {
    console.error('Test Failed with error:', error);
    process.exit(1);
}
//# sourceMappingURL=aiSelfplay.test.js.map