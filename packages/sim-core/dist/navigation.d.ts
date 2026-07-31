import { ScaledVector2 } from '@ra4/shared-types';
export interface PathNode {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent?: PathNode;
}
export declare class NavigationService {
    width: number;
    height: number;
    passabilityGrid: number[][];
    constructor(width?: number, height?: number, passabilityGrid?: number[][]);
    isWalkable(gx: number, gy: number): boolean;
    findPath(startX: number, startY: number, endX: number, endY: number): ScaledVector2[];
    private findNearestWalkableTile;
    calculateGroupFormations(targetX: number, targetY: number, count: number, spacing?: number): ScaledVector2[];
}
//# sourceMappingURL=navigation.d.ts.map