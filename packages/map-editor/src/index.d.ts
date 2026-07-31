import { MapDefinition } from '@ra4/shared-types';
export declare class MapEditorEngine {
    map: MapDefinition;
    constructor(id: string, name: string, width?: number, height?: number);
    setPassability(x: number, y: number, type: number): void;
    addSpawnPoint(index: number, x: number, y: number): void;
    addResourceNode(id: string, x: number, y: number, isRich: boolean): void;
    exportJSON(): string;
}
//# sourceMappingURL=index.d.ts.map