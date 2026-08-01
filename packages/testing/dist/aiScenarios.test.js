import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';
console.log('=== Running 4 implemented RTS AI baseline scenarios ===');
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
// Scenario 1: Base & Economy Expansion
{
    const manager = new MatchLifecycleManager();
    manager.initialize({
        seed: 12345,
        tickRate: 30,
        players: [
            { name: 'AI Player 1', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
            { name: 'AI Player 2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
        ]
    });
    for (let i = 0; i < 600; i++) {
        if (manager.sim)
            manager.sim.step();
    }
    const p1Buildings = manager.sim ? Array.from(manager.sim.entities.values()).filter(e => e.playerIndex === 0 && e.isBuilding) : [];
    assert(p1Buildings.length >= 2, 'Scenario 1 failed: AI did not expand its base');
    console.log('✓ Scenario 1 Passed: AI Base & Economy Expansion');
}
// Scenario 11: FOW Compliance Verification
{
    const manager = new MatchLifecycleManager();
    manager.initialize({
        seed: 111,
        tickRate: 30,
        players: [
            { name: 'Alliance AI', factionId: FactionId.ALLIANCE, type: PlayerType.AI_HARD, team: 0 },
            { name: 'Hidden USSR', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 1 }
        ]
    });
    for (let tick = 0; tick < 30; tick++)
        manager.sim?.step();
    const ai = manager.sim?.aiAgents.get(0);
    assert(ai !== undefined, 'Scenario 11 failed: AI agent was not created');
    assert(ai.blackboard.intelEntries.size === 0, 'Scenario 11 failed: AI learned hidden enemy state');
    console.log('✓ Scenario 11 Passed: hidden enemy state is absent from AI memory');
}
// Scenario 14: Headless AI vs AI Self-Play
{
    const manager = new MatchLifecycleManager();
    manager.initialize({
        seed: 777,
        tickRate: 30,
        players: [
            { name: 'AI 1 (USSR)', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
            { name: 'AI 2 (Allies)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
        ]
    });
    const maxTicks = 20_000;
    while (manager.sim && manager.sim.tickIndex < maxTicks && manager.sim.winnerTeam === -1) {
        manager.sim.step();
    }
    assert(manager.sim?.winnerTeam !== -1, 'Scenario 14 failed: self-play did not finish before the deadline');
    console.log(`✓ Scenario 14 Passed: self-play winner team ${manager.sim?.winnerTeam} at tick ${manager.sim?.tickIndex}`);
}
// Scenario 16: PRNG Seeded Determinism Verification
{
    const runMatch = (seed) => {
        const manager = new MatchLifecycleManager();
        manager.initialize({
            seed,
            tickRate: 30,
            players: [
                { name: 'AI 1', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
                { name: 'AI 2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
            ]
        });
        for (let i = 0; i < 300; i++) {
            if (manager.sim)
                manager.sim.step();
        }
        return manager.sim ? manager.sim.calculateChecksum() : 0;
    };
    const cs1 = runMatch(424242);
    const cs2 = runMatch(424242);
    assert(cs1 === cs2, `Scenario 16 failed: checksum mismatch ${cs1} !== ${cs2}`);
    console.log(`✓ Scenario 16 Passed: deterministic checksum match (${cs1})`);
}
console.log('SUCCESS! All 4 implemented AI baseline scenarios passed.');
//# sourceMappingURL=aiScenarios.test.js.map