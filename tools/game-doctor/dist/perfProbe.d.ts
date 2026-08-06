import { GameSimulation } from '@ra4/sim-core';
type SimCtor = new (seed?: number, w?: number, h?: number, mapId?: string) => GameSimulation;
/** Build the canonical 1500-entity head-on collision scenario. */
export declare function buildStressScenario(Sim?: SimCtor): GameSimulation;
export interface WorkCountResult {
    ticks: number;
    gridVisits: number;
    visitsPerTick: number;
    avgEntities: number;
    /** The load-independent figure to compare across builds. */
    visitsPerEntityTick: number;
    finalChecksum: number;
}
/** Count spatial-grid candidate visits — deterministic, load-independent. */
export declare function workCount(ticks?: number, Sim?: SimCtor): WorkCountResult;
export interface InterleavedResult {
    label: string;
    p50: number;
    p95: number;
    p99: number;
}
/**
 * Step two builds alternately so machine load affects both equally.
 * Compare the RATIO between results, not the absolute values.
 */
export declare function compareInterleaved(builds: {
    label: string;
    Sim: SimCtor;
}[], ticks?: number): InterleavedResult[];
export {};
