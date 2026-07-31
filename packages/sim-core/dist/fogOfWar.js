export var FogState;
(function (FogState) {
    FogState[FogState["UNEXPLORED"] = 0] = "UNEXPLORED";
    FogState[FogState["EXPLORED"] = 1] = "EXPLORED";
    FogState[FogState["VISIBLE"] = 2] = "VISIBLE";
})(FogState || (FogState = {}));
export class FogOfWarManager {
    width;
    height;
    teamGrids; // team -> grid
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.teamGrids = new Map();
    }
    registerTeam(team) {
        if (!this.teamGrids.has(team)) {
            this.teamGrids.set(team, new Uint8Array(this.width * this.height));
        }
    }
    resetVisibility(team) {
        const grid = this.teamGrids.get(team);
        if (!grid)
            return;
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === FogState.VISIBLE) {
                grid[i] = FogState.EXPLORED;
            }
        }
    }
    revealCircle(team, gridX, gridY, radiusGrid) {
        const grid = this.teamGrids.get(team);
        if (!grid)
            return;
        const rSq = radiusGrid * radiusGrid;
        const minX = Math.max(0, gridX - radiusGrid);
        const maxX = Math.min(this.width - 1, gridX + radiusGrid);
        const minY = Math.max(0, gridY - radiusGrid);
        const maxY = Math.min(this.height - 1, gridY + radiusGrid);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const dx = x - gridX;
                const dy = y - gridY;
                if (dx * dx + dy * dy <= rSq) {
                    const idx = y * this.width + x;
                    grid[idx] = FogState.VISIBLE;
                }
            }
        }
    }
    getFogState(team, gridX, gridY) {
        const grid = this.teamGrids.get(team);
        if (!grid)
            return FogState.UNEXPLORED;
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return FogState.UNEXPLORED;
        }
        return grid[gridY * this.width + gridX];
    }
    isVisible(team, gridX, gridY) {
        return this.getFogState(team, gridX, gridY) === FogState.VISIBLE;
    }
}
//# sourceMappingURL=fogOfWar.js.map