import { ArmorType, BuildingCategory, CommandType, FactionId, MatchState, PassabilityType, PlayerCommand, PlayerEconomyState, PlayerType, TechTier, UnitCategory, VeterancyRank, WorldSnapshot } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { Mulberry32PRNG } from './prng.js';
import { SpatialHashGrid } from './spatialGrid.js';
import { FogOfWarManager } from './fogOfWar.js';
import { calculateDamage } from './combat.js';
import { fixedDistanceSq } from './fixedMath.js';
import { NavigationService } from './navigation.js';
import { SkirmishAIAgent } from './aiAgent.js';

export interface SimEntity {
  id: number;
  specId: string;
  factionId: FactionId;
  playerIndex: number;
  category: UnitCategory | BuildingCategory;
  x: number; // scaled int (1000 = 1 map tile)
  y: number; // scaled int
  targetX?: number;
  targetY?: number;
  waypoints?: { x: number; y: number }[];
  rotation: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  armorType: ArmorType;
  veterancy: VeterancyRank;
  expEarned: number;
  isBuilding: boolean;
  isPowered: boolean;
  isDisabled: boolean;
  attackCooldown: number;
  targetEntityId?: number;
  moveSpeed: number; // scaled int per tick
  sightRange: number;
  weaponId?: string;
  currentOre: number;
  maxOre: number;
  refineryTargetId?: number;
  harvestingNodeId?: string;
  harvestTimer: number;
  productionQueue: {
    specId: string;
    itemType: 'UNIT' | 'BUILDING';
    costTotal: number;
    costPaid: number;
    progressTicks: number;
    totalTicks: number;
  }[];
}

export interface ResourceNodeState {
  id: string;
  x: number;
  y: number;
  isRich: boolean;
  creditsRemaining: number;
}

export class GameSimulation {
  public tickIndex: number = 0;
  public seed: number;
  public prng: Mulberry32PRNG;
  public spatialGrid: SpatialHashGrid;
  public fogOfWar: FogOfWarManager;
  public navigation: NavigationService;

  public entities: Map<number, SimEntity> = new Map();
  public players: PlayerEconomyState[] = [];
  public resourceNodes: Map<string, ResourceNodeState> = new Map();
  public aiAgents: Map<number, SkirmishAIAgent> = new Map();

  public nextEntityId: number = 1;
  public matchState: MatchState = MatchState.IN_GAME;
  public winnerTeam: number = -1;

  constructor(seed: number = 1337, mapWidth: number = 64, mapHeight: number = 64) {
    this.seed = seed;
    this.prng = new Mulberry32PRNG(seed);
    this.spatialGrid = new SpatialHashGrid(4000);
    this.fogOfWar = new FogOfWarManager(mapWidth, mapHeight);
    this.navigation = new NavigationService(mapWidth, mapHeight);
  }

  public initMatch(playerConfigs: { name: string; factionId: FactionId; type: PlayerType; team: number }[]): void {
    this.players = playerConfigs.map(cfg => ({
      credits: 10000,
      powerProduced: 100,
      powerConsumed: 0,
      powerLow: false,
      commandCapUsed: 0,
      commandCapMax: 50,
      factionResource: 0,
      techTier: TechTier.T1,
      hasHQ: true
    }));

    playerConfigs.forEach((p, idx) => {
      this.fogOfWar.registerTeam(p.team);
      if (p.type !== PlayerType.HUMAN && p.type !== PlayerType.SPECTATOR) {
        this.aiAgents.set(idx, new SkirmishAIAgent(idx));
      }
    });

    // Spawn Resource Nodes from default map
    const defaultMap = DEFAULT_DATABASE.maps[0];
    defaultMap.resourceNodes.forEach(rn => {
      this.resourceNodes.set(rn.id, {
        id: rn.id,
        x: rn.x * 1000,
        y: rn.y * 1000,
        isRich: rn.isRich,
        creditsRemaining: rn.creditsRemaining
      });
    });

    // Spawn Starting HQs & Harvesters for players
    defaultMap.spawnPoints.slice(0, playerConfigs.length).forEach((sp, idx) => {
      const p = playerConfigs[idx];
      const faction = DEFAULT_DATABASE.factions.find(f => f.id === p.factionId)!;

      // Spawn HQ
      const hqSpec = DEFAULT_DATABASE.buildings.find(b => b.id === faction.hqBuildingId)!;
      const hqId = this.spawnBuilding(hqSpec.id, idx, sp.x * 1000, sp.y * 1000);

      // Spawn Starting Harvester
      const harvestSpec = DEFAULT_DATABASE.units.find(u => u.factionId === p.factionId && u.harvesterCapacity)!;
      if (harvestSpec) {
        this.spawnUnit(harvestSpec.id, idx, (sp.x + 3) * 1000, (sp.y + 3) * 1000);
      }
    });

    this.recalculateEconomy();
  }

  public spawnBuilding(specId: string, playerIndex: number, x: number, y: number): number {
    const spec = DEFAULT_DATABASE.buildings.find(b => b.id === specId)!;
    const id = this.nextEntityId++;
    const entity: SimEntity = {
      id,
      specId,
      factionId: spec.factionId,
      playerIndex,
      category: spec.category,
      x,
      y,
      rotation: 0,
      hp: spec.hp,
      maxHp: spec.hp,
      shield: spec.shield,
      maxShield: spec.shield,
      armorType: spec.armorType,
      veterancy: VeterancyRank.Rookie,
      expEarned: 0,
      isBuilding: true,
      isPowered: true,
      isDisabled: false,
      attackCooldown: 0,
      sightRange: spec.sightRange,
      weaponId: spec.weaponId,
      moveSpeed: 0,
      currentOre: 0,
      maxOre: 0,
      harvestTimer: 0,
      productionQueue: []
    };

    this.entities.set(id, entity);
    this.recalculateEconomy();
    return id;
  }

  public spawnUnit(specId: string, playerIndex: number, x: number, y: number): number {
    const spec = DEFAULT_DATABASE.units.find(u => u.id === specId)!;
    const id = this.nextEntityId++;
    const entity: SimEntity = {
      id,
      specId,
      factionId: spec.factionId,
      playerIndex,
      category: spec.category,
      x,
      y,
      rotation: 0,
      hp: spec.hp,
      maxHp: spec.hp,
      shield: spec.shield,
      maxShield: spec.shield,
      armorType: spec.armorType,
      veterancy: VeterancyRank.Rookie,
      expEarned: 0,
      isBuilding: false,
      isPowered: true,
      isDisabled: false,
      attackCooldown: 0,
      sightRange: spec.sightRange,
      weaponId: spec.weaponId,
      moveSpeed: Math.round(spec.speed / 30), // per tick
      currentOre: 0,
      maxOre: spec.harvesterCapacity ?? 0,
      harvestTimer: 0,
      productionQueue: []
    };

    this.entities.set(id, entity);
    this.recalculateEconomy();
    return id;
  }

  public processCommands(commands: PlayerCommand[]): void {
    for (const cmd of commands) {
      this.executeCommand(cmd);
    }
  }

  private executeCommand(cmd: PlayerCommand): void {
    const p = this.players[cmd.playerIndex];
    if (!p) return;

    switch (cmd.type) {
      case CommandType.MOVE: {
        const movableEntities = cmd.entityIds
          .map(id => this.entities.get(id))
          .filter((e): e is SimEntity => !!e && e.playerIndex === cmd.playerIndex && !e.isBuilding);

        if (movableEntities.length > 0) {
          const targets = this.navigation.calculateGroupFormations(cmd.targetX, cmd.targetY, movableEntities.length);
          movableEntities.forEach((e, idx) => {
            const targetPos = targets[idx] ?? { x: cmd.targetX, y: cmd.targetY };
            e.targetX = targetPos.x;
            e.targetY = targetPos.y;
            e.waypoints = this.navigation.findPath(e.x, e.y, targetPos.x, targetPos.y);
            e.targetEntityId = undefined;
          });
        }
        break;
      }
      case CommandType.ATTACK: {
        for (const id of cmd.entityIds) {
          const e = this.entities.get(id);
          if (e && e.playerIndex === cmd.playerIndex && !e.isBuilding) {
            e.targetEntityId = cmd.targetEntityId;
            e.targetX = undefined;
            e.targetY = undefined;
            e.waypoints = undefined;
          }
        }
        break;
      }
      case CommandType.STOP: {
        for (const id of cmd.entityIds) {
          const e = this.entities.get(id);
          if (e && e.playerIndex === cmd.playerIndex) {
            e.targetX = undefined;
            e.targetY = undefined;
            e.targetEntityId = undefined;
            e.waypoints = undefined;
          }
        }
        break;
      }
      case CommandType.GATHER: {
        for (const id of cmd.entityIds) {
          const e = this.entities.get(id);
          if (e && e.playerIndex === cmd.playerIndex && e.maxOre > 0) {
            e.harvestingNodeId = cmd.resourceNodeId;
            e.refineryTargetId = undefined;
            e.targetEntityId = undefined;
          }
        }
        break;
      }
      case CommandType.DEPOSIT_ORE: {
        for (const id of cmd.entityIds) {
          const e = this.entities.get(id);
          if (e && e.playerIndex === cmd.playerIndex && e.maxOre > 0) {
            e.refineryTargetId = cmd.refineryEntityId;
            e.targetEntityId = undefined;
          }
        }
        break;
      }
      case CommandType.PRODUCE_UNIT: {
        const producer = this.entities.get(cmd.producerEntityId);
        if (producer && producer.playerIndex === cmd.playerIndex && producer.isBuilding) {
          const unitSpec = DEFAULT_DATABASE.units.find(u => u.id === cmd.unitId);
          if (unitSpec && p.credits >= unitSpec.cost && (p.commandCapUsed + unitSpec.commandCapCost) <= p.commandCapMax) {
            p.credits -= unitSpec.cost;
            producer.productionQueue.push({
              specId: unitSpec.id,
              itemType: 'UNIT',
              costTotal: unitSpec.cost,
              costPaid: unitSpec.cost,
              progressTicks: 0,
              totalTicks: Math.round(unitSpec.buildTimeSeconds * 30)
            });
          }
        }
        break;
      }
      case CommandType.BUILD_STRUCTURE: {
        const structSpec = DEFAULT_DATABASE.buildings.find(b => b.id === cmd.structureId);
        if (structSpec && p.credits >= structSpec.cost) {
          p.credits -= structSpec.cost;
          this.spawnBuilding(cmd.structureId, cmd.playerIndex, cmd.gridX * 1000, cmd.gridY * 1000);
        }
        break;
      }
      case CommandType.SURRENDER: {
        p.hasHQ = false;
        break;
      }
      default:
        break;
    }
  }

  public step(): WorldSnapshot {
    this.tickIndex++;

    // 0. AI Agents Decision Loop
    for (const agent of this.aiAgents.values()) {
      const aiCmds = agent.update(this);
      this.processCommands(aiCmds);
    }

    // 1. Spatial Grid Reset
    this.spatialGrid.clear();
    for (const e of this.entities.values()) {
      this.spatialGrid.insert({ id: e.id, x: e.x, y: e.y, radius: 1000 });
    }

    // 2. Production Queues
    for (const e of this.entities.values()) {
      if (e.productionQueue.length > 0 && e.isPowered) {
        const item = e.productionQueue[0];
        item.progressTicks++;
        if (item.progressTicks >= item.totalTicks) {
          e.productionQueue.shift();
          this.spawnUnit(item.specId, e.playerIndex, e.x + 2000, e.y + 2000);
        }
      }
    }

    // 3. Movement Logic with Waypoints
    for (const e of this.entities.values()) {
      if (!e.isBuilding) {
        let currTargetX = e.targetX;
        let currTargetY = e.targetY;

        if (e.waypoints && e.waypoints.length > 0) {
          currTargetX = e.waypoints[0].x;
          currTargetY = e.waypoints[0].y;
        }

        if (currTargetX !== undefined && currTargetY !== undefined) {
          const distSq = fixedDistanceSq(e.x, e.y, currTargetX, currTargetY);
          const stepDistSq = e.moveSpeed * e.moveSpeed;

          if (distSq <= stepDistSq) {
            e.x = currTargetX;
            e.y = currTargetY;
            if (e.waypoints && e.waypoints.length > 0) {
              e.waypoints.shift();
              if (e.waypoints.length === 0) {
                e.waypoints = undefined;
                e.targetX = undefined;
                e.targetY = undefined;
              }
            } else {
              e.targetX = undefined;
              e.targetY = undefined;
            }
          } else {
            const dist = Math.sqrt(distSq);
            const dx = (currTargetX - e.x) / dist;
            const dy = (currTargetY - e.y) / dist;
            e.x += Math.round(dx * e.moveSpeed);
            e.y += Math.round(dy * e.moveSpeed);
            e.rotation = Math.atan2(dy, dx);
          }
        }
      }
    }

    // 4. Ore Harvesting Logic
    for (const e of this.entities.values()) {
      if (e.maxOre > 0) {
        // Harvester logic
        if (e.currentOre < e.maxOre) {
          // Find nearest ore node
          let nearestNode: ResourceNodeState | undefined;
          let minDistSq = Infinity;
          for (const rn of this.resourceNodes.values()) {
            if (rn.creditsRemaining > 0) {
              const dSq = fixedDistanceSq(e.x, e.y, rn.x, rn.y);
              if (dSq < minDistSq) {
                minDistSq = dSq;
                nearestNode = rn;
              }
            }
          }

          if (nearestNode) {
            if (minDistSq <= 4000 * 4000) {
              // Harvest tick
              e.harvestTimer++;
              if (e.harvestTimer >= 15) { // every half second
                e.harvestTimer = 0;
                const mined = Math.min(100, nearestNode.creditsRemaining);
                nearestNode.creditsRemaining -= mined;
                e.currentOre += mined;
              }
            } else if (e.targetX === undefined) {
              e.targetX = nearestNode.x;
              e.targetY = nearestNode.y;
            }
          }
        } else {
          // Return to refinery
          if (!e.refineryTargetId) {
            for (const ref of this.entities.values()) {
              if (ref.playerIndex === e.playerIndex && ref.category === BuildingCategory.Refinery) {
                e.refineryTargetId = ref.id;
                break;
              }
            }
          }

          if (e.refineryTargetId) {
            const ref = this.entities.get(e.refineryTargetId);
            if (ref) {
              const dSq = fixedDistanceSq(e.x, e.y, ref.x, ref.y);
              if (dSq <= 4000 * 4000) {
                // Deposit ore
                this.players[e.playerIndex].credits += e.currentOre;
                e.currentOre = 0;
                e.refineryTargetId = undefined;
              } else if (e.targetX === undefined) {
                e.targetX = ref.x;
                e.targetY = ref.y;
              }
            }
          }
        }
      }
    }

    // 5. Combat & Attack Logic
    for (const e of this.entities.values()) {
      if (e.attackCooldown > 0) {
        e.attackCooldown--;
      }

      if (e.weaponId && e.attackCooldown === 0) {
        const weapon = DEFAULT_DATABASE.weapons.find(w => w.id === e.weaponId);
        if (!weapon) continue;

        let target: SimEntity | undefined;

        if (e.targetEntityId) {
          target = this.entities.get(e.targetEntityId);
        } else {
          // Auto-target nearest enemy
          const candidates = this.spatialGrid.queryRadius(e.x, e.y, weapon.range);
          let minDistSq = weapon.range * weapon.range;

          for (const candId of candidates) {
            const cand = this.entities.get(candId);
            if (cand && cand.playerIndex !== e.playerIndex && cand.hp > 0) {
              const dSq = fixedDistanceSq(e.x, e.y, cand.x, cand.y);
              if (dSq <= minDistSq) {
                minDistSq = dSq;
                target = cand;
              }
            }
          }
        }

        if (target && target.hp > 0) {
          const dSq = fixedDistanceSq(e.x, e.y, target.x, target.y);
          if (dSq <= weapon.range * weapon.range) {
            // Fire weapon
            e.attackCooldown = weapon.cooldownTicks;
            const dmg = calculateDamage(weapon.baseDamage, weapon.damageType, target.armorType);

            // Shield absorption
            if (target.shield > 0) {
              const shieldDmg = Math.min(target.shield, dmg);
              target.shield -= shieldDmg;
              const remainingDmg = dmg - shieldDmg;
              target.hp -= remainingDmg;
            } else {
              target.hp -= dmg;
            }

            // Target killed
            if (target.hp <= 0) {
              this.entities.delete(target.id);
              e.expEarned += 10;
              if (e.expEarned >= 50 && e.veterancy < VeterancyRank.Heroic) {
                e.veterancy = Math.min(VeterancyRank.Heroic, e.veterancy + 1);
              }
            }
          } else if (!e.isBuilding && e.targetX === undefined) {
            // Move into attack range
            e.targetX = target.x;
            e.targetY = target.y;
          }
        }
      }
    }

    // 6. Recalculate Power Grid & Victory
    this.recalculateEconomy();
    this.checkVictory();

    return this.createSnapshot();
  }

  public recalculateEconomy(): void {
    for (let pIdx = 0; pIdx < this.players.length; pIdx++) {
      const p = this.players[pIdx];
      let powerProduced = 100;
      let powerConsumed = 0;
      let commandCapUsed = 0;
      let commandCapMax = 50;
      let hasHQ = false;

      for (const e of this.entities.values()) {
        if (e.playerIndex === pIdx) {
          if (e.isBuilding) {
            const spec = DEFAULT_DATABASE.buildings.find(b => b.id === e.specId);
            if (spec) {
              powerProduced += spec.powerProduced;
              powerConsumed += spec.powerConsumed;
              commandCapMax += spec.commandCapGranted;
              if (spec.category === BuildingCategory.HQ) hasHQ = true;
            }
          } else {
            const spec = DEFAULT_DATABASE.units.find(u => u.id === e.specId);
            if (spec) {
              commandCapUsed += spec.commandCapCost;
            }
          }
        }
      }

      p.powerProduced = powerProduced;
      p.powerConsumed = powerConsumed;
      p.powerLow = powerConsumed > powerProduced;
      p.commandCapUsed = commandCapUsed;
      p.commandCapMax = commandCapMax;
      p.hasHQ = hasHQ;
    }
  }

  public checkVictory(): void {
    const activeTeams = new Set<number>();
    this.players.forEach((p, idx) => {
      if (p.hasHQ) {
        activeTeams.add(idx);
      }
    });

    if (activeTeams.size === 1 && this.matchState === MatchState.IN_GAME) {
      this.matchState = MatchState.FINISHED;
      this.winnerTeam = Array.from(activeTeams)[0];
    }
  }

  public calculateChecksum(): number {
    let hash = this.tickIndex ^ this.seed;
    for (const e of this.entities.values()) {
      hash = ((hash << 5) - hash) + e.id + e.x + e.y + e.hp + e.currentOre;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  public createSnapshot(): WorldSnapshot {
    const entitySnapshots = Array.from(this.entities.values()).map(e => ({
      id: e.id,
      specId: e.specId,
      factionId: e.factionId,
      playerIndex: e.playerIndex,
      category: e.category,
      position: { x: e.x, y: e.y },
      rotation: e.rotation,
      hp: e.hp,
      maxHp: e.maxHp,
      shield: e.shield,
      maxShield: e.maxShield,
      armorType: e.armorType,
      veterancy: e.veterancy,
      isBuilding: e.isBuilding,
      isPowered: e.isPowered,
      isDisabled: e.isDisabled,
      targetEntityId: e.targetEntityId,
      moveTarget: e.targetX !== undefined && e.targetY !== undefined ? { x: e.targetX, y: e.targetY } : undefined,
      currentOre: e.currentOre,
      maxOre: e.maxOre,
      productionQueue: e.productionQueue.map(item => ({
        id: item.specId,
        itemType: item.itemType,
        specId: item.specId,
        costTotal: item.costTotal,
        costPaid: item.costPaid,
        progressTicks: item.progressTicks,
        totalTicks: item.totalTicks
      }))
    }));

    return {
      tick: this.tickIndex,
      checksum: this.calculateChecksum(),
      seed: this.seed,
      entities: entitySnapshots,
      players: this.players
    };
  }
}
