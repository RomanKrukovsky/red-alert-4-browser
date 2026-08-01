import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';
console.log('=== RTS AI Headless Benchmark Harness: Running Self-Play Evaluation ===');
const totalGames = Math.max(1, Number.parseInt(process.env.AI_BENCHMARK_GAMES ?? '100', 10));
const maxTicks = Math.max(1, Number.parseInt(process.env.AI_BENCHMARK_MAX_TICKS ?? '30000', 10));
let p0Wins = 0;
let p1Wins = 0;
let timedOutGames = 0;
let totalTicks = 0;
const cpuTimes = [];
for (let gameIdx = 1; gameIdx <= totalGames; gameIdx++) {
    const manager = new MatchLifecycleManager();
    const seed = 1000 + gameIdx;
    manager.initialize({
        seed,
        tickRate: 30,
        players: [
            { name: 'AI 0 (Soviet Aggressive)', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
            { name: 'AI 1 (Allies Adaptive)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
        ]
    });
    let completed = false;
    for (let tick = 0; tick < maxTicks; tick++) {
        const t0 = performance.now();
        if (manager.sim)
            manager.sim.step();
        const t1 = performance.now();
        cpuTimes.push(t1 - t0);
        if (manager.sim && manager.sim.winnerTeam !== -1) {
            if (manager.sim.winnerTeam === 0)
                p0Wins++;
            else if (manager.sim.winnerTeam === 1)
                p1Wins++;
            completed = true;
            break;
        }
    }
    if (!completed)
        timedOutGames++;
    if (manager.sim) {
        totalTicks += manager.sim.tickIndex;
    }
}
cpuTimes.sort((a, b) => a - b);
const avgCpu = cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length;
const p95Cpu = cpuTimes[Math.floor(cpuTimes.length * 0.95)] || 0;
const p99Cpu = cpuTimes[Math.floor(cpuTimes.length * 0.99)] || 0;
console.log('\n--- RTS AI Benchmark Results ---');
console.log(`Total Games Executed: ${totalGames}`);
console.log(`P0 (Soviet) Win Count: ${p0Wins}`);
console.log(`P1 (Allies) Win Count: ${p1Wins}`);
console.log(`Completed Matches: ${totalGames - timedOutGames}`);
console.log(`Timed Out Matches: ${timedOutGames}`);
console.log(`Average Ticks per Match: ${(totalTicks / totalGames).toFixed(0)} ticks`);
console.log(`Average AI Compute Time / Tick: ${avgCpu.toFixed(4)} ms`);
console.log(`95th Percentile Tick Time: ${p95Cpu.toFixed(4)} ms`);
console.log(`99th Percentile Tick Time: ${p99Cpu.toFixed(4)} ms`);
if (p0Wins + p1Wins === 0) {
    throw new Error('Benchmark failed: no match reached a victory condition');
}
console.log('SUCCESS! AI Headless Benchmark Harness completed with real match outcomes.');
//# sourceMappingURL=aiBenchmark.js.map