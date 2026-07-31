import { ScaledVector2 } from '@ra4/shared-types';
import { fixedDistanceSq } from './fixedMath.js';

export interface PathNode {
  x: number; // grid coords (0-63)
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

export class NavigationService {
  public width: number;
  public height: number;
  public passabilityGrid: number[][];

  constructor(width: number = 64, height: number = 64, passabilityGrid?: number[][]) {
    this.width = width;
    this.height = height;
    this.passabilityGrid = passabilityGrid ?? Array(height).fill(0).map(() => Array(width).fill(0));
  }

  public isWalkable(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return false;
    return this.passabilityGrid[gy][gx] === 0; // 0 = Land/Walkable
  }

  public findPath(startX: number, startY: number, endX: number, endY: number): ScaledVector2[] {
    const sgx = Math.floor(startX / 1000);
    const sgy = Math.floor(startY / 1000);
    const egx = Math.floor(endX / 1000);
    const egy = Math.floor(endY / 1000);

    if (!this.isWalkable(egx, egy)) {
      // If end tile blocked, find nearest walkable neighbor
      const neighbor = this.findNearestWalkableTile(egx, egy);
      if (!neighbor) return [{ x: endX, y: endY }];
    }

    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: sgx,
      y: sgy,
      g: 0,
      h: Math.abs(egx - sgx) + Math.abs(egy - sgy),
      f: 0
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);

    while (openList.length > 0) {
      // Sort to get node with lowest f cost
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      if (current.x === egx && current.y === egy) {
        // Reconstruct path
        const path: ScaledVector2[] = [];
        let curr: PathNode | undefined = current;
        while (curr) {
          path.unshift({ x: curr.x * 1000 + 500, y: curr.y * 1000 + 500 });
          curr = curr.parent;
        }
        return path;
      }

      const key = `${current.x}:${current.y}`;
      closedSet.add(key);

      // Check 8-way neighbors
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y + 1 },
        { x: current.x - 1, y: current.y - 1 },
        { x: current.x + 1, y: current.y - 1 },
        { x: current.x - 1, y: current.y + 1 }
      ];

      for (const n of neighbors) {
        if (!this.isWalkable(n.x, n.y)) continue;
        const nKey = `${n.x}:${n.y}`;
        if (closedSet.has(nKey)) continue;

        const isDiagonal = n.x !== current.x && n.y !== current.y;
        const moveCost = isDiagonal ? 14 : 10;
        const gScore = current.g + moveCost;

        let existing = openList.find(node => node.x === n.x && node.y === n.y);
        if (!existing) {
          const hScore = (Math.abs(egx - n.x) + Math.abs(egy - n.y)) * 10;
          existing = {
            x: n.x,
            y: n.y,
            g: gScore,
            h: hScore,
            f: gScore + hScore,
            parent: current
          };
          openList.push(existing);
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.f = gScore + existing.h;
          existing.parent = current;
        }
      }
    }

    // Direct fallback if no path found
    return [{ x: endX, y: endY }];
  }

  private findNearestWalkableTile(gx: number, gy: number): { x: number; y: number } | null {
    for (let r = 1; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (this.isWalkable(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null;
  }

  public calculateGroupFormations(targetX: number, targetY: number, count: number, spacing: number = 2000): ScaledVector2[] {
    const offsets: ScaledVector2[] = [];
    const cols = Math.ceil(Math.sqrt(count));

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offsetX = (col - (cols - 1) / 2) * spacing;
      const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * spacing;

      offsets.push({
        x: Math.round(targetX + offsetX),
        y: Math.round(targetY + offsetY)
      });
    }

    return offsets;
  }
}
