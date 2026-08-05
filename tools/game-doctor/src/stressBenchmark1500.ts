import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerType } from '@ra4/shared-types';

/**
 * 1500-entity stress benchmark — the data source for the Rust/WASM decision
 * gate. Spawns 750 units per side, orders both armies across the map through
 * each other (worst-case pathfinding + avoidance + combat), and measures
 * per-tick simulation time percentiles.
 *
 * GATE: if simTickP95Ms > 8.0 under this scenario, hot systems (pathfinding
 * first) are ported to Rust/WASM behind the same command/snapshot boundary.
 */

interface StressReport {
  timestamp: string;
  scenario: string;
  entityCountPeak: number;
  ticksMeasured: number;
  simTickP50Ms: number;
  simTickP95Ms: number;
  simTickP99Ms: number;
  simTickAvgMs: number;
  simTickMaxMs: number;
  wasmGateThresholdMs: number;
  wasmGateTriggered: boolean;
  passed: boolean;
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

export function runStressBenchmark1500(): StressReport {
  console.log('⚙️  [Stress1500] Initializing 1500-entity worst-case scenario...');
  const sim = new GameSimulation(20260805);
  sim.initMatch([
    { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'P2', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 1 },
  ]);

  const armyA: number[] = [];
  const armyB: number[] = [];
  const perSide = 750;
  const cols = 28;
  for (let i = 0; i < perSide; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Mixed composition: 80% infantry, 20% tanks
    const specA = i % 5 === 0 ? 'SU_GranitMBT' : 'SU_RubezhRifleman';
    armyA.push(sim.spawnUnit(specA, 0, Math.min(62000, 3000 + col * 1100), Math.min(62000, 3000 + row * 1100)));
    armyB.push(sim.spawnUnit(specA, 1, Math.max(1000, 60000 - col * 1100), Math.max(1000, 60000 - row * 1100)));
  }

  const entityCountPeak = sim.entities.size;
  console.log(`⚙️  [Stress1500] Entities in world: ${entityCountPeak}`);

  // Cross-map attack-move through each other — pathfinding + avoidance + combat.
  sim.processCommands([
    { type: CommandType.ATTACK_MOVE, entityIds: armyA, targetX: 58000, targetY: 58000, playerIndex: 0, tick: 0 },
    { type: CommandType.ATTACK_MOVE, entityIds: armyB, targetX: 5000, targetY: 5000, playerIndex: 1, tick: 0 },
  ]);

  const ticksToMeasure = 1500; // 50 seconds of game time at 30 Hz
  const tickTimes: number[] = [];
  for (let t = 0; t < ticksToMeasure; t++) {
    const t0 = performance.now();
    sim.step();
    tickTimes.push(performance.now() - t0);
    if (t % 300 === 0) {
      console.log(`⚙️  [Stress1500] tick ${t}: ${sim.entities.size} entities alive, last tick ${tickTimes[tickTimes.length - 1].toFixed(2)} ms`);
    }
  }

  const sorted = [...tickTimes].sort((a, b) => a - b);
  const avg = tickTimes.reduce((s, x) => s + x, 0) / tickTimes.length;
  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const p99 = percentile(sorted, 0.99);
  const max = sorted[sorted.length - 1];

  const WASM_GATE_MS = 8.0;
  // Budget: the tick must comfortably fit a 33.33 ms frame at 30 Hz even at p99.
  const passed = p99 < 33.33;

  const report: StressReport = {
    timestamp: new Date().toISOString(),
    scenario: '1500 entities (2×750 mixed infantry/tanks), cross-map attack-move collision, 1500 ticks',
    entityCountPeak,
    ticksMeasured: ticksToMeasure,
    simTickP50Ms: Number(p50.toFixed(3)),
    simTickP95Ms: Number(p95.toFixed(3)),
    simTickP99Ms: Number(p99.toFixed(3)),
    simTickAvgMs: Number(avg.toFixed(3)),
    simTickMaxMs: Number(max.toFixed(3)),
    wasmGateThresholdMs: WASM_GATE_MS,
    wasmGateTriggered: p95 > WASM_GATE_MS,
    passed,
  };

  const outDir = path.join(process.cwd(), 'artifacts', 'benchmarks');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'stress-1500.json'), JSON.stringify(report, null, 2));

  console.log('⚙️  ─────────────────────────────────────────');
  console.log(`⚙️  [Stress1500] p50=${report.simTickP50Ms} ms  p95=${report.simTickP95Ms} ms  p99=${report.simTickP99Ms} ms  avg=${report.simTickAvgMs} ms  max=${report.simTickMaxMs} ms`);
  console.log(`⚙️  [Stress1500] WASM gate (p95 > ${WASM_GATE_MS} ms): ${report.wasmGateTriggered ? '🔴 TRIGGERED — plan Rust/WASM port of hot systems' : '🟢 not triggered — TS core within budget'}`);
  console.log(`⚙️  [Stress1500] 30 Hz budget check (p99 < 33.33 ms): ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`⚙️  [Stress1500] Report → artifacts/benchmarks/stress-1500.json`);
  return report;
}
