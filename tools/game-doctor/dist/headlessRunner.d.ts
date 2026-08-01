export interface HeadlessResult {
    name: string;
    passed: boolean;
    durationMs: number;
    ticksRun: number;
    finalChecksum: number;
    error?: string;
}
export declare class HeadlessTestRunner {
    runAll(): Promise<HeadlessResult[]>;
    private testHarvesterEconomyCycle;
    private testBuildingChain;
    private testArmyProductionAndCombat;
    private testHQDestructionAndVictoryDefeat;
    private testLossOfHarvesterAndPowerPlant;
    private testAIRecovery;
    private testDeterminismAndChecksum;
    private testThirtyMinuteSimulation;
}
