/**
 * Deterministic RTS navigation service.
 *
 * Three cooperating layers:
 *  1. Passability grid (Uint8Array) — terrain plus registered building
 *     footprints. Buildings block tiles; units may never occupy them.
 *  2. A* single-unit pathfinding with a binary heap and deterministic
 *     tie-breaking (f, then h, then insertion order).
 *  3. Flow fields for group orders — one Dijkstra integration field per
 *     goal tile, shared by every unit in the group. Cached and invalidated
 *     when the passability grid changes. O(cells) per unique goal instead
 *     of O(units × A*).
 *
 * All computations are integer-based and independent of iteration order of
 * unordered collections, so results are identical across JS engines.
 */
const TILE = 1000; // scaled units per grid tile
/** 8-way neighbor offsets in a fixed, deterministic order. */
const DIRS = [
    // [dx, dy, cost] — cardinals cost 10, diagonals 14
    [1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
    [1, 1, 14], [-1, -1, 14], [1, -1, 14], [-1, 1, 14],
];
/** Deterministic binary min-heap keyed by (f, h, seq). */
class NodeHeap {
    f = [];
    h = [];
    seq = [];
    idx = [];
    size = 0;
    counter = 0;
    push(cellIndex, f, h) {
        const i = this.size++;
        this.f[i] = f;
        this.h[i] = h;
        this.seq[i] = this.counter++;
        this.idx[i] = cellIndex;
        this.bubbleUp(i);
    }
    pop() {
        const top = this.idx[0];
        this.size--;
        if (this.size > 0) {
            this.f[0] = this.f[this.size];
            this.h[0] = this.h[this.size];
            this.seq[0] = this.seq[this.size];
            this.idx[0] = this.idx[this.size];
            this.bubbleDown(0);
        }
        return top;
    }
    get length() { return this.size; }
    less(a, b) {
        if (this.f[a] !== this.f[b])
            return this.f[a] < this.f[b];
        if (this.h[a] !== this.h[b])
            return this.h[a] < this.h[b];
        return this.seq[a] < this.seq[b];
    }
    swap(a, b) {
        let t = this.f[a];
        this.f[a] = this.f[b];
        this.f[b] = t;
        t = this.h[a];
        this.h[a] = this.h[b];
        this.h[b] = t;
        t = this.seq[a];
        this.seq[a] = this.seq[b];
        this.seq[b] = t;
        t = this.idx[a];
        this.idx[a] = this.idx[b];
        this.idx[b] = t;
    }
    bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.less(i, parent)) {
                this.swap(i, parent);
                i = parent;
            }
            else
                break;
        }
    }
    bubbleDown(i) {
        for (;;) {
            const l = i * 2 + 1;
            const r = l + 1;
            let smallest = i;
            if (l < this.size && this.less(l, smallest))
                smallest = l;
            if (r < this.size && this.less(r, smallest))
                smallest = r;
            if (smallest === i)
                break;
            this.swap(i, smallest);
            i = smallest;
        }
    }
}
export class NavigationService {
    width;
    height;
    /** 0 = walkable, 1 = terrain-blocked, 2+ = building obstacle refcount base. */
    grid;
    /** Incremented on every obstacle change; invalidates flow field cache. */
    version = 0;
    flowCache = new Map();
    static FLOW_CACHE_MAX = 64;
    static UNREACHABLE = 0xffff;
    constructor(width = 64, height = 64, passabilityGrid) {
        this.width = width;
        this.height = height;
        this.grid = new Uint8Array(width * height);
        if (passabilityGrid) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (passabilityGrid[y]?.[x])
                        this.grid[y * width + x] = 1;
                }
            }
        }
    }
    // ── Passability ────────────────────────────────────────────────────────
    isWalkable(gx, gy) {
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height)
            return false;
        return this.grid[gy * this.width + gx] === 0;
    }
    /** True when the scaled-coordinate position lies on a walkable tile. */
    isWalkableWorld(x, y) {
        return this.isWalkable(Math.floor(x / TILE), Math.floor(y / TILE));
    }
    /**
     * Register a building footprint centered on (gridX, gridY) with the given
     * grid dimensions. Marks tiles as obstacles and invalidates cached flow
     * fields. Refcounted so overlapping registrations unregister cleanly.
     */
    registerObstacle(gridX, gridY, gridWidth, gridHeight) {
        this.stampObstacle(gridX, gridY, gridWidth, gridHeight, +1);
    }
    unregisterObstacle(gridX, gridY, gridWidth, gridHeight) {
        this.stampObstacle(gridX, gridY, gridWidth, gridHeight, -1);
    }
    stampObstacle(gridX, gridY, gridWidth, gridHeight, delta) {
        const halfW = Math.max(1, Math.ceil(gridWidth / 2));
        const halfH = Math.max(1, Math.ceil(gridHeight / 2));
        for (let y = gridY - halfH + 1; y <= gridY + halfH - 1; y++) {
            for (let x = gridX - halfW + 1; x <= gridX + halfW - 1; x++) {
                if (x < 0 || x >= this.width || y < 0 || y >= this.height)
                    continue;
                const i = y * this.width + x;
                const current = this.grid[i];
                // Terrain blockage (value 1) is permanent; obstacles use values >= 2.
                if (delta > 0) {
                    this.grid[i] = current === 0 ? 2 : current === 1 ? 1 : Math.min(255, current + 1);
                }
                else if (current >= 2) {
                    this.grid[i] = current === 2 ? 0 : current - 1;
                }
            }
        }
        this.version++;
        this.flowCache.clear();
    }
    // ── Single-unit A* ─────────────────────────────────────────────────────
    findPath(startX, startY, endX, endY) {
        const sgx = this.clampX(Math.floor(startX / TILE));
        const sgy = this.clampY(Math.floor(startY / TILE));
        let egx = this.clampX(Math.floor(endX / TILE));
        let egy = this.clampY(Math.floor(endY / TILE));
        if (!this.isWalkable(egx, egy)) {
            const near = this.findNearestWalkableTile(egx, egy);
            if (!near)
                return [{ x: endX, y: endY }];
            egx = near.x;
            egy = near.y;
        }
        if (!this.isWalkable(sgx, sgy)) {
            // Unit stuck inside an obstacle (e.g. just-placed building) — escape first.
            const near = this.findNearestWalkableTile(sgx, sgy);
            if (near) {
                const escape = { x: near.x * TILE + TILE / 2, y: near.y * TILE + TILE / 2 };
                return [escape, ...this.findPath(escape.x, escape.y, endX, endY)];
            }
            return [{ x: endX, y: endY }];
        }
        if (sgx === egx && sgy === egy) {
            return [{ x: endX, y: endY }];
        }
        const w = this.width;
        const cellCount = w * this.height;
        const gScore = new Int32Array(cellCount).fill(0x7fffffff);
        const cameFrom = new Int32Array(cellCount).fill(-1);
        const closed = new Uint8Array(cellCount);
        const startIdx = sgy * w + sgx;
        const goalIdx = egy * w + egx;
        gScore[startIdx] = 0;
        const heap = new NodeHeap();
        heap.push(startIdx, this.heuristic(sgx, sgy, egx, egy), this.heuristic(sgx, sgy, egx, egy));
        let found = false;
        while (heap.length > 0) {
            const current = heap.pop();
            if (current === goalIdx) {
                found = true;
                break;
            }
            if (closed[current])
                continue;
            closed[current] = 1;
            const cx = current % w;
            const cy = (current - cx) / w;
            for (let d = 0; d < DIRS.length; d++) {
                const nx = cx + DIRS[d][0];
                const ny = cy + DIRS[d][1];
                if (!this.isWalkable(nx, ny))
                    continue;
                // Prevent diagonal corner cutting through blocked cardinals.
                if (DIRS[d][2] === 14 && (!this.isWalkable(cx + DIRS[d][0], cy) || !this.isWalkable(cx, cy + DIRS[d][1])))
                    continue;
                const ni = ny * w + nx;
                if (closed[ni])
                    continue;
                const tentative = gScore[current] + DIRS[d][2];
                if (tentative < gScore[ni]) {
                    gScore[ni] = tentative;
                    cameFrom[ni] = current;
                    const h = this.heuristic(nx, ny, egx, egy);
                    heap.push(ni, tentative + h, h);
                }
            }
        }
        if (!found)
            return [{ x: endX, y: endY }];
        // Reconstruct, convert to world coords, simplify collinear runs.
        const tilePath = [];
        for (let i = goalIdx; i !== -1; i = cameFrom[i])
            tilePath.push(i);
        tilePath.reverse();
        const path = [];
        let prevDx = Number.NaN;
        let prevDy = Number.NaN;
        for (let i = 1; i < tilePath.length; i++) {
            const px = tilePath[i - 1] % w;
            const py = (tilePath[i - 1] - px) / w;
            const cx2 = tilePath[i] % w;
            const cy2 = (tilePath[i] - cx2) / w;
            const dx = cx2 - px;
            const dy = cy2 - py;
            if (dx !== prevDx || dy !== prevDy) {
                path.push({ x: cx2 * TILE + TILE / 2, y: cy2 * TILE + TILE / 2 });
                prevDx = dx;
                prevDy = dy;
            }
            else {
                // Extend the last waypoint along the same direction.
                path[path.length - 1] = { x: cx2 * TILE + TILE / 2, y: cy2 * TILE + TILE / 2 };
            }
        }
        // Final exact destination if its tile is the goal tile.
        if (Math.floor(endX / TILE) === egx && Math.floor(endY / TILE) === egy) {
            path[path.length - 1] = { x: endX, y: endY };
        }
        return path.length > 0 ? path : [{ x: endX, y: endY }];
    }
    heuristic(x1, y1, x2, y2) {
        // Octile distance scaled to match move costs (10 / 14).
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        return dx > dy ? 14 * dy + 10 * (dx - dy) : 14 * dx + 10 * (dy - dx);
    }
    // ── Flow fields (group movement) ───────────────────────────────────────
    /**
     * Compute (or fetch cached) flow field toward the goal world position.
     * Returns null when the goal region is fully unreachable.
     */
    getFlowField(goalWorldX, goalWorldY) {
        let gx = this.clampX(Math.floor(goalWorldX / TILE));
        let gy = this.clampY(Math.floor(goalWorldY / TILE));
        if (!this.isWalkable(gx, gy)) {
            const near = this.findNearestWalkableTile(gx, gy);
            if (!near)
                return null;
            gx = near.x;
            gy = near.y;
        }
        const key = gy * this.width + gx;
        const cached = this.flowCache.get(key);
        if (cached && cached.version === this.version)
            return cached;
        const field = this.buildFlowField(gx, gy);
        if (this.flowCache.size >= NavigationService.FLOW_CACHE_MAX) {
            // Evict the oldest entry (Map preserves insertion order — deterministic).
            const oldest = this.flowCache.keys().next().value;
            if (oldest !== undefined)
                this.flowCache.delete(oldest);
        }
        this.flowCache.set(key, field);
        return field;
    }
    buildFlowField(goalGx, goalGy) {
        const w = this.width;
        const cellCount = w * this.height;
        const cost = new Uint16Array(cellCount).fill(NavigationService.UNREACHABLE);
        const dir = new Uint8Array(cellCount).fill(255);
        const goalIdx = goalGy * w + goalGx;
        cost[goalIdx] = 0;
        // Dijkstra from goal outward (deterministic heap ordering).
        const heap = new NodeHeap();
        heap.push(goalIdx, 0, 0);
        const visited = new Uint8Array(cellCount);
        while (heap.length > 0) {
            const current = heap.pop();
            if (visited[current])
                continue;
            visited[current] = 1;
            const cx = current % w;
            const cy = (current - cx) / w;
            for (let d = 0; d < DIRS.length; d++) {
                const nx = cx + DIRS[d][0];
                const ny = cy + DIRS[d][1];
                if (!this.isWalkable(nx, ny))
                    continue;
                if (DIRS[d][2] === 14 && (!this.isWalkable(cx + DIRS[d][0], cy) || !this.isWalkable(cx, cy + DIRS[d][1])))
                    continue;
                const ni = ny * w + nx;
                if (visited[ni])
                    continue;
                const tentative = cost[current] + DIRS[d][2];
                if (tentative < cost[ni]) {
                    cost[ni] = tentative;
                    heap.push(ni, tentative, 0);
                }
            }
        }
        // Direction assignment: each cell points to its lowest-cost neighbor.
        for (let i = 0; i < cellCount; i++) {
            if (cost[i] === NavigationService.UNREACHABLE || i === goalIdx)
                continue;
            const cx = i % w;
            const cy = (i - cx) / w;
            let best = -1;
            let bestCost = cost[i];
            for (let d = 0; d < DIRS.length; d++) {
                const nx = cx + DIRS[d][0];
                const ny = cy + DIRS[d][1];
                if (nx < 0 || nx >= w || ny < 0 || ny >= this.height)
                    continue;
                if (DIRS[d][2] === 14 && (!this.isWalkable(cx + DIRS[d][0], cy) || !this.isWalkable(cx, cy + DIRS[d][1])))
                    continue;
                const ni = ny * w + nx;
                if (cost[ni] < bestCost) {
                    bestCost = cost[ni];
                    best = d;
                }
            }
            if (best >= 0)
                dir[i] = best;
        }
        return { cost, dir, goalX: goalGx, goalY: goalGy, version: this.version };
    }
    /**
     * Flow direction at a world position as a unit-scaled integer vector
     * ({dx, dy} in tile steps), or null if the cell has no direction.
     */
    sampleFlow(field, worldX, worldY) {
        const gx = this.clampX(Math.floor(worldX / TILE));
        const gy = this.clampY(Math.floor(worldY / TILE));
        const d = field.dir[gy * this.width + gx];
        if (d === 255)
            return null;
        return { dx: DIRS[d][0], dy: DIRS[d][1] };
    }
    /** True when a world position's tile can reach the field's goal. */
    isReachable(field, worldX, worldY) {
        const gx = this.clampX(Math.floor(worldX / TILE));
        const gy = this.clampY(Math.floor(worldY / TILE));
        return field.cost[gy * this.width + gx] !== NavigationService.UNREACHABLE;
    }
    // ── Helpers ────────────────────────────────────────────────────────────
    findNearestWalkableTile(gx, gy) {
        for (let r = 1; r <= 8; r++) {
            // Deterministic ring scan order.
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r)
                        continue;
                    const nx = gx + dx;
                    const ny = gy + dy;
                    if (this.isWalkable(nx, ny))
                        return { x: nx, y: ny };
                }
            }
        }
        return null;
    }
    calculateGroupFormations(targetX, targetY, count, spacing = 2000) {
        const offsets = [];
        const cols = Math.ceil(Math.sqrt(count));
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const offsetX = (col - (cols - 1) / 2) * spacing;
            const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * spacing;
            let x = Math.round(targetX + offsetX);
            let y = Math.round(targetY + offsetY);
            // Snap formation slots landing inside obstacles to the nearest walkable tile.
            if (!this.isWalkableWorld(x, y)) {
                const near = this.findNearestWalkableTile(Math.floor(x / TILE), Math.floor(y / TILE));
                if (near) {
                    x = near.x * TILE + TILE / 2;
                    y = near.y * TILE + TILE / 2;
                }
            }
            offsets.push({ x, y });
        }
        return offsets;
    }
    clampX(v) { return v < 0 ? 0 : v >= this.width ? this.width - 1 : v; }
    clampY(v) { return v < 0 ? 0 : v >= this.height ? this.height - 1 : v; }
}
//# sourceMappingURL=navigation.js.map