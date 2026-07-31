export declare enum FogState {
    UNEXPLORED = 0,
    EXPLORED = 1,
    VISIBLE = 2
}
export declare class FogOfWarManager {
    width: number;
    height: number;
    private teamGrids;
    constructor(width: number, height: number);
    registerTeam(team: number): void;
    resetVisibility(team: number): void;
    revealCircle(team: number, gridX: number, gridY: number, radiusGrid: number): void;
    getFogState(team: number, gridX: number, gridY: number): FogState;
    isVisible(team: number, gridX: number, gridY: number): boolean;
}
//# sourceMappingURL=fogOfWar.d.ts.map