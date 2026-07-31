export enum FogState {
  UNEXPLORED = 0,
  EXPLORED = 1,
  VISIBLE = 2
}

export class FogOfWarManager {
  public width: number;
  public height: number;
  private teamGrids: Map<number, Uint8Array>; // team -> grid

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.teamGrids = new Map();
  }

  public registerTeam(team: number): void {
    if (!this.teamGrids.has(team)) {
      this.teamGrids.set(team, new Uint8Array(this.width * this.height));
    }
  }

  public resetVisibility(team: number): void {
    const grid = this.teamGrids.get(team);
    if (!grid) return;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === FogState.VISIBLE) {
        grid[i] = FogState.EXPLORED;
      }
    }
  }

  public revealCircle(team: number, gridX: number, gridY: number, radiusGrid: number): void {
    const grid = this.teamGrids.get(team);
    if (!grid) return;

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

  public getFogState(team: number, gridX: number, gridY: number): FogState {
    const grid = this.teamGrids.get(team);
    if (!grid) return FogState.UNEXPLORED;
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return FogState.UNEXPLORED;
    }
    return grid[gridY * this.width + gridX];
  }

  public isVisible(team: number, gridX: number, gridY: number): boolean {
    return this.getFogState(team, gridX, gridY) === FogState.VISIBLE;
  }
}
