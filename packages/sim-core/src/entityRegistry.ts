import { SimEntity } from './simulation.js';

export class EntityRegistry {
  private entities: Map<number, SimEntity> = new Map();
  private nextId: number = 1;

  public register(entity: SimEntity): void {
    this.entities.set(entity.id, entity);
  }

  public get(id: number): SimEntity | undefined {
    return this.entities.get(id);
  }

  public getAll(): SimEntity[] {
    return Array.from(this.entities.values());
  }

  public remove(id: number): boolean {
    return this.entities.delete(id);
  }

  public generateId(): number {
    return this.nextId++;
  }

  public clear(): void {
    this.entities.clear();
    this.nextId = 1;
  }
}
