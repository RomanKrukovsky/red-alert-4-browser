export declare enum AIDecisionLane {
    STRATEGY = "STRATEGY",
    ECONOMY = "ECONOMY",
    PRODUCTION = "PRODUCTION",
    TACTICAL = "TACTICAL"
}
export interface AIEntityObservation {
    id: number;
    specId: string;
    isBuilding: boolean;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    playerIndex: number;
}
export declare class AIScheduler {
    private readonly difficulty;
    constructor(difficulty?: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR');
    private scaleInterval;
    shouldRunWorldModel(tickIndex: number, playerIndex: number): boolean;
    shouldRunEconomy(tickIndex: number, playerIndex: number): boolean;
    shouldRunBasePlanner(tickIndex: number, playerIndex: number): boolean;
    shouldRunProduction(tickIndex: number, playerIndex: number): boolean;
    shouldRunTactical(tickIndex: number, playerIndex: number): boolean;
}
//# sourceMappingURL=aiScheduler.d.ts.map