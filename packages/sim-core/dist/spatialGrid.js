export class SpatialHashGrid {
    cellSize;
    grid;
    constructor(cellSize = 4000) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    clear() {
        this.grid.clear();
    }
    getKey(cx, cy) {
        return `${cx}:${cy}`;
    }
    insert(entity) {
        const minCx = Math.floor((entity.x - entity.radius) / this.cellSize);
        const maxCx = Math.floor((entity.x + entity.radius) / this.cellSize);
        const minCy = Math.floor((entity.y - entity.radius) / this.cellSize);
        const maxCy = Math.floor((entity.y + entity.radius) / this.cellSize);
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = this.getKey(cx, cy);
                let list = this.grid.get(key);
                if (!list) {
                    list = [];
                    this.grid.set(key, list);
                }
                list.push(entity.id);
            }
        }
    }
    queryRadius(x, y, radius) {
        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);
        const resultSet = new Set();
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = this.getKey(cx, cy);
                const list = this.grid.get(key);
                if (list) {
                    for (let i = 0; i < list.length; i++) {
                        resultSet.add(list[i]);
                    }
                }
            }
        }
        return Array.from(resultSet);
    }
}
//# sourceMappingURL=spatialGrid.js.map