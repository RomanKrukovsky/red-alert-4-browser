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
export declare function runStressBenchmark1500(): StressReport;
export {};
