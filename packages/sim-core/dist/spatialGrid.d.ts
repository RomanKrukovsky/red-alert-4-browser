export interface SpatialEntity {
    id: number;
    x: number;
    y: number;
    radius: number;
}
export declare class SpatialHashGrid {
    private cellSize;
    private grid;
    constructor(cellSize?: number);
    clear(): void;
    private getKey;
    insert(entity: SpatialEntity): void;
    queryRadius(x: number, y: number, radius: number): number[];
}
//# sourceMappingURL=spatialGrid.d.ts.map