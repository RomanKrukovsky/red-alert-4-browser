import { ScaledVector2 } from '@ra4/shared-types';
interface FlowField {
    /** Per-cell integration cost (0xffff = unreachable). */
    cost: Uint16Array;
    /** Per-cell direction index into DIRS (255 = none/goal/unreachable). */
    dir: Uint8Array;
    goalX: number;
    goalY: number;
    version: number;
}
export declare class NavigationService {
    width: number;
    height: number;
    /** 0 = walkable, 1 = terrain-blocked, 2+ = building obstacle refcount base. */
    private grid;
    /** Incremented on every obstacle change; invalidates flow field cache. */
    private version;
    private flowCache;
    private static readonly FLOW_CACHE_MAX;
    private static readonly UNREACHABLE;
    constructor(width?: number, height?: number, passabilityGrid?: number[][]);
    isWalkable(gx: number, gy: number): boolean;
    /** True when the scaled-coordinate position lies on a walkable tile. */
    isWalkableWorld(x: number, y: number): boolean;
    /**
     * Register a building footprint centered on (gridX, gridY) with the given
     * grid dimensions. Marks tiles as obstacles and invalidates cached flow
     * fields. Refcounted so overlapping registrations unregister cleanly.
     */
    registerObstacle(gridX: number, gridY: number, gridWidth: number, gridHeight: number): void;
    unregisterObstacle(gridX: number, gridY: number, gridWidth: number, gridHeight: number): void;
    private stampObstacle;
    findPath(startX: number, startY: number, endX: number, endY: number): ScaledVector2[];
    private heuristic;
    /**
     * Compute (or fetch cached) flow field toward the goal world position.
     * Returns null when the goal region is fully unreachable.
     */
    getFlowField(goalWorldX: number, goalWorldY: number): FlowField | null;
    private buildFlowField;
    /**
     * Flow direction at a world position as a unit-scaled integer vector
     * ({dx, dy} in tile steps), or null if the cell has no direction.
     */
    sampleFlow(field: FlowField, worldX: number, worldY: number): {
        dx: number;
        dy: number;
    } | null;
    /** True when a world position's tile can reach the field's goal. */
    isReachable(field: FlowField, worldX: number, worldY: number): boolean;
    findNearestWalkableTile(gx: number, gy: number): {
        x: number;
        y: number;
    } | null;
    calculateGroupFormations(targetX: number, targetY: number, count: number, spacing?: number): ScaledVector2[];
    private clampX;
    private clampY;
}
export {};
//# sourceMappingURL=navigation.d.ts.map