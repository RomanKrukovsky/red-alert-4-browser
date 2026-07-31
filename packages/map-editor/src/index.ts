import { MapDefinition, ResourceNodeMapEntry, SpawnPointMapEntry, NeutralStructureMapEntry } from '@ra4/shared-types';

export class MapEditorEngine {
  public map: MapDefinition;

  constructor(id: string, name: string, width: number = 64, height: number = 64) {
    this.map = {
      id,
      name,
      width,
      height,
      maxPlayers: 4,
      spawnPoints: [],
      resourceNodes: [],
      neutralStructures: [],
      heightMap: Array(height).fill(0).map(() => Array(width).fill(0)),
      passabilityGrid: Array(height).fill(0).map(() => Array(width).fill(0))
    };
  }

  public setPassability(x: number, y: number, type: number): void {
    if (x >= 0 && x < this.map.width && y >= 0 && y < this.map.height) {
      this.map.passabilityGrid[y][x] = type;
    }
  }

  public addSpawnPoint(index: number, x: number, y: number): void {
    this.map.spawnPoints.push({ index, x, y });
  }

  public addResourceNode(id: string, x: number, y: number, isRich: boolean): void {
    this.map.resourceNodes.push({
      id,
      x,
      y,
      isRich,
      creditsRemaining: isRich ? 75000 : 45000
    });
  }

  public exportJSON(): string {
    return JSON.stringify(this.map, null, 2);
  }
}
