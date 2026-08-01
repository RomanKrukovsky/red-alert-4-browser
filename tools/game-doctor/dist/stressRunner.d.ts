import { PerformanceSnapshot } from './types.js';
export declare class StressRunner {
    runStressSuite(): Promise<{
        name: string;
        passed: boolean;
        durationMs: number;
        metrics: Partial<PerformanceSnapshot>;
    }[]>;
    private benchmarkUnits;
    private benchmarkFiringUnits;
    private benchmarkFourAIs;
    private benchmarkTenMatches;
}
