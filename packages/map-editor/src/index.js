export class MapEditorEngine {
    map;
    constructor(id, name, width = 64, height = 64) {
        this.map = {
            id,
            name,
            width,
            height,
            maxPlayers: 4,
            spawnPoints: [],
            resourceNodes: [],
            neutralStructures: [],
            heightMap: Array(height).fill(0).map(() => Array(width).fill(0)),
            passabilityGrid: Array(height).fill(0).map(() => Array(width).fill(0))
        };
    }
    setPassability(x, y, type) {
        if (x >= 0 && x < this.map.width && y >= 0 && y < this.map.height) {
            this.map.passabilityGrid[y][x] = type;
        }
    }
    addSpawnPoint(index, x, y) {
        this.map.spawnPoints.push({ index, x, y });
    }
    addResourceNode(id, x, y, isRich) {
        this.map.resourceNodes.push({
            id,
            x,
            y,
            isRich,
            creditsRemaining: isRich ? 75000 : 45000
        });
    }
    exportJSON() {
        return JSON.stringify(this.map, null, 2);
    }
}
//# sourceMappingURL=index.js.map