export interface SpatialEntity {
    id: number;
    x: number;
    y: number;
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
export declare class SpatialHashGrid<T extends SpatialEntity = SpatialEntity> {
    private cellSize;
    private cols;
    private rows;
    private buckets;
    /** Cells that received at least one entity this tick (for cheap clear). */
    private dirty;
    private static readonly MAX_ENTITY_RADIUS;
    private static readonly WORLD_SIZE;
    constructor(cellSize?: number);
    clear(): void;
    private cellIndex;
    insert(entity: T): void;
    /**
     * Invoke `visit` for every entity whose center may lie within `radius`
     * of (x, y). May include entities slightly outside the radius — callers
     * must distance-check. Zero allocations, no Map lookups.
     */
    forEachInRadius(x: number, y: number, radius: number, visit: (entity: T) => void): void;
    /** Legacy id-array API (allocates) — prefer forEachInRadius in hot paths. */
    queryRadius(x: number, y: number, radius: number): number[];
}
//# sourceMappingURL=spatialGrid.d.ts.map