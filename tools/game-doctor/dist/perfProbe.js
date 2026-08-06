import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerType } from '@ra4/shared-types';
/**
 * Contention-immune performance measurement.
 *
 * Wall-clock percentiles are worthless on a loaded machine (we observed >10x
 * variance between runs of the SAME build at load average 24-120). These two
 * methods give trustworthy answers regardless of load:
 *
 *   1. workCount()  — counts spatial-grid candidate visits over a fixed
 *      scenario. Deterministic: same seed => same count, load irrelevant.
 *      Reported per entity-tick, because a behaviour change alters how fast
 *      units die and therefore the entity population.
 *
 *   2. compareInterleaved() — steps two builds alternately in one process so
 *      machine load hits both equally; the RATIO stays valid even when the
 *      absolute numbers are inflated.
 *
 * Use these to decide whether a simulation change regressed cost when
 * `benchmark:stress-1500` cannot be trusted.
 */
const SEED = 20250806;
const ARMY_PER_SIDE = 750;
const DEFAULT_TICKS = 1500;
/** Build the canonical 1500-entity head-on collision scenario. */
export function buildStressScenario(Sim = GameSimulation) {
    const sim = new Sim(SEED);
    sim.initMatch([
        { name: 'A', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'B', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 1 },
    ], 50_000);
    const armyA = [];
    const armyB = [];
    for (let i = 0; i < ARMY_PER_SIDE; i++) {
        const col = i % 30;
        const row = Math.floor(i / 30);
        // 20% tanks / 80% infantry — infantry sight (8000) exceeds its weapon
        // range (6000), which is exactly the case two-stage acquisition affects.
        const spec = i % 5 === 0 ? 'SU_GranitMBT' : 'SU_RubezhRifleman';
        armyA.push(sim.spawnUnit(spec, 0, Math.min(62_000, 3000 + col * 1100), Math.min(62_000, 3000 + row * 1100)));
        armyB.push(sim.spawnUnit(spec, 1, Math.max(1000, 60_000 - col * 1100), Math.max(1000, 60_000 - row * 1100)));
    }
    sim.processCommands([
        { type: CommandType.ATTACK_MOVE, entityIds: armyA, targetX: 58_000, targetY: 58_000, playerIndex: 0, tick: 0 },
        { type: CommandType.ATTACK_MOVE, entityIds: armyB, targetX: 5000, targetY: 5000, playerIndex: 1, tick: 0 },
    ]);
    return sim;
}
/** Count spatial-grid candidate visits — deterministic, load-independent. */
export function workCount(ticks = DEFAULT_TICKS, Sim = GameSimulation) {
    const sim = buildStressScenario(Sim);
    let visits = 0;
    const grid = sim.spatialGrid;
    const original = grid.forEachInRadius.bind(grid);
    grid.forEachInRadius = (x, y, r, cb) => original(x, y, r, (candidate) => { visits++; return cb(candidate); });
    let entitySum = 0;
    for (let t = 0; t < ticks; t++) {
        sim.step();
        entitySum += sim.entities.size;
    }
    const avgEntities = Math.round(entitySum / ticks);
    return {
        ticks,
        gridVisits: visits,
        visitsPerTick: Math.round(visits / ticks),
        avgEntities,
        visitsPerEntityTick: Number((visits / ticks / avgEntities).toFixed(1)),
        finalChecksum: sim.calculateChecksum(),
    };
}
const percentile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};
/**
 * Step two builds alternately so machine load affects both equally.
 * Compare the RATIO between results, not the absolute values.
 */
export function compareInterleaved(builds, ticks = DEFAULT_TICKS) {
    const sims = builds.map((b) => ({ label: b.label, sim: buildStressScenario(b.Sim), samples: [] }));
    for (let t = 0; t < ticks; t++) {
        for (const entry of sims) {
            const start = performance.now();
            entry.sim.step();
            entry.samples.push(performance.now() - start);
        }
    }
    return sims.map((entry) => ({
        label: entry.label,
        p50: Number(percentile(entry.samples, 0.5).toFixed(3)),
        p95: Number(percentile(entry.samples, 0.95).toFixed(3)),
        p99: Number(percentile(entry.samples, 0.99).toFixed(3)),
    }));
}
