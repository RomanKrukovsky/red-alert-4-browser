export interface SpatialEntity {
  id: number;
  x: number; // scaled int
  y: number; // scaled int
  radius: number; // scaled int
}

export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, number[]>;

  constructor(cellSize: number = 4000) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  public clear(): void {
    this.grid.clear();
  }

  private getKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  public insert(entity: SpatialEntity): void {
    const minCx = Math.floor((entity.x - entity.radius) / this.cellSize);
    const maxCx = Math.floor((entity.x + entity.radius) / this.cellSize);
    const minCy = Math.floor((entity.y - entity.radius) / this.cellSize);
    const maxCy = Math.floor((entity.y + entity.radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(entity.id);
      }
    }
  }

  public queryRadius(x: number, y: number, radius: number): number[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const resultSet = new Set<number>();

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const list = this.grid.get(key);
        if (list) {
          for (let i = 0; i < list.length; i++) {
            resultSet.add(list[i]);
          }
        }
      }
    }

    return Array.from(resultSet);
  }
}
