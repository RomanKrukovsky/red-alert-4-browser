export interface SpatialEntity {
  id: number;
  x: number; // scaled int
  y: number; // scaled int
}

/**
 * Allocation-free spatial hash grid.
 *
 * Entities are inserted into a single bucket by center point; queries expand
 * their bounds by MAX_ENTITY_RADIUS to compensate. Buckets are plain arrays
 * that are reused across ticks (length reset, no reallocation), and lookups
 * use numeric cell indices — no string keys, no Sets, no per-query arrays
 * when using the callback API.
 *
 * Iteration order inside a bucket is insertion order (deterministic: the
 * simulation inserts entities in ascending-id map order every tick).
 */
export class SpatialHashGrid<T extends SpatialEntity = SpatialEntity> {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private buckets: T[][];
  /** Cells that received at least one entity this tick (for cheap clear). */
  private dirty: number[] = [];

  private static readonly MAX_ENTITY_RADIUS = 1000;
  private static readonly WORLD_SIZE = 64000; // scaled units (64 tiles)

  constructor(cellSize: number = 4000) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(SpatialHashGrid.WORLD_SIZE / cellSize) + 2;
    this.rows = this.cols;
    this.buckets = new Array(this.cols * this.rows);
    for (let i = 0; i < this.buckets.length; i++) this.buckets[i] = [];
  }

  public clear(): void {
    for (let i = 0; i < this.dirty.length; i++) {
      this.buckets[this.dirty[i]].length = 0;
    }
    this.dirty.length = 0;
  }

  private cellIndex(x: number, y: number): number {
    let cx = Math.floor(x / this.cellSize);
    let cy = Math.floor(y / this.cellSize);
    if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  public insert(entity: T): void {
    const idx = this.cellIndex(entity.x, entity.y);
    const bucket = this.buckets[idx];
    if (bucket.length === 0) this.dirty.push(idx);
    bucket.push(entity);
  }

  /**
   * Invoke `visit` for every entity whose center may lie within `radius`
   * of (x, y). May include entities slightly outside the radius — callers
   * must distance-check. Zero allocations, no Map lookups.
   */
  public forEachInRadius(x: number, y: number, radius: number, visit: (entity: T) => void): void {
    const expand = radius + SpatialHashGrid.MAX_ENTITY_RADIUS;
    let minCx = Math.floor((x - expand) / this.cellSize);
    let maxCx = Math.floor((x + expand) / this.cellSize);
    let minCy = Math.floor((y - expand) / this.cellSize);
    let maxCy = Math.floor((y + expand) / this.cellSize);
    if (minCx < 0) minCx = 0;
    if (minCy < 0) minCy = 0;
    if (maxCx >= this.cols) maxCx = this.cols - 1;
    if (maxCy >= this.rows) maxCy = this.rows - 1;

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowBase = cy * this.cols;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.buckets[rowBase + cx];
        for (let i = 0; i < bucket.length; i++) visit(bucket[i]);
      }
    }
  }

  /** Legacy id-array API (allocates) — prefer forEachInRadius in hot paths. */
  public queryRadius(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    this.forEachInRadius(x, y, radius, (entity) => result.push(entity.id));
    return result;
  }
}
