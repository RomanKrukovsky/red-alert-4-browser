export class EntityRegistry {
    entities = new Map();
    nextId = 1;
    register(entity) {
        this.entities.set(entity.id, entity);
    }
    get(id) {
        return this.entities.get(id);
    }
    getAll() {
        return Array.from(this.entities.values());
    }
    remove(id) {
        return this.entities.delete(id);
    }
    generateId() {
        return this.nextId++;
    }
    clear() {
        this.entities.clear();
        this.nextId = 1;
    }
}
//# sourceMappingURL=entityRegistry.js.map