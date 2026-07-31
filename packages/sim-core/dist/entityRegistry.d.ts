import { SimEntity } from './simulation.js';
export declare class EntityRegistry {
    private entities;
    private nextId;
    register(entity: SimEntity): void;
    get(id: number): SimEntity | undefined;
    getAll(): SimEntity[];
    remove(id: number): boolean;
    generateId(): number;
    clear(): void;
}
//# sourceMappingURL=entityRegistry.d.ts.map