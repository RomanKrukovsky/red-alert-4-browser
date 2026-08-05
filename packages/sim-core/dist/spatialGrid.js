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
export class SpatialHashGrid {
    cellSize;
    cols;
    rows;
    buckets;
    /** Cells that received at least one entity this tick (for cheap clear). */
    dirty = [];
    static MAX_ENTITY_RADIUS = 1000;
    constructor(cellSize = 4000, worldSize = 128000) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(worldSize / cellSize) + 2;
        this.rows = this.cols;
        this.buckets = new Array(this.cols * this.rows);
        for (let i = 0; i < this.buckets.length; i++)
            this.buckets[i] = [];
    }
    clear() {
        for (let i = 0; i < this.dirty.length; i++) {
            this.buckets[this.dirty[i]].length = 0;
        }
        this.dirty.length = 0;
    }
    cellIndex(x, y) {
        let cx = Math.floor(x / this.cellSize);
        let cy = Math.floor(y / this.cellSize);
        if (cx < 0)
            cx = 0;
        else if (cx >= this.cols)
            cx = this.cols - 1;
        if (cy < 0)
            cy = 0;
        else if (cy >= this.rows)
            cy = this.rows - 1;
        return cy * this.cols + cx;
    }
    insert(entity) {
        const idx = this.cellIndex(entity.x, entity.y);
        const bucket = this.buckets[idx];
        if (bucket.length === 0)
            this.dirty.push(idx);
        bucket.push(entity);
    }
    /**
     * Invoke `visit` for every entity whose center may lie within `radius`
     * of (x, y). May include entities slightly outside the radius — callers
     * must distance-check. Zero allocations, no Map lookups.
     */
    forEachInRadius(x, y, radius, visit) {
        const expand = radius + SpatialHashGrid.MAX_ENTITY_RADIUS;
        let minCx = Math.floor((x - expand) / this.cellSize);
        let maxCx = Math.floor((x + expand) / this.cellSize);
        let minCy = Math.floor((y - expand) / this.cellSize);
        let maxCy = Math.floor((y + expand) / this.cellSize);
        if (minCx < 0)
            minCx = 0;
        if (minCy < 0)
            minCy = 0;
        if (maxCx >= this.cols)
            maxCx = this.cols - 1;
        if (maxCy >= this.rows)
            maxCy = this.rows - 1;
        for (let cy = minCy; cy <= maxCy; cy++) {
            const rowBase = cy * this.cols;
            for (let cx = minCx; cx <= maxCx; cx++) {
                const bucket = this.buckets[rowBase + cx];
                for (let i = 0; i < bucket.length; i++)
                    visit(bucket[i]);
            }
        }
    }
    /** Legacy id-array API (allocates) — prefer forEachInRadius in hot paths. */
    queryRadius(x, y, radius) {
        const result = [];
        this.forEachInRadius(x, y, radius, (entity) => result.push(entity.id));
        return result;
    }
}
//# sourceMappingURL=spatialGrid.js.map