import { ArmorType, assertNever, BuildingCategory, CommandType, FactionId, MatchState, PassabilityType, PlayerCommand, PlayerEconomyState, PlayerType, TechTier, UnitCategory, VeterancyRank, WorldSnapshot } from '@ra4/shared-types';
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
  /** Active flow-field goal (tile-center world coords) for large group moves. */
  flowGoalX?: number;
  flowGoalY?: number;
  /** Building footprint in grid tiles (buildings only) for obstacle removal. */
  gridWidth?: number;
  gridHeight?: number;
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
  disabledTicksRemaining: number;
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

import { SuperweaponManager } from './superweaponManager.js';

// O(1) content lookup maps (content is immutable at runtime).
const UNIT_SPEC_BY_ID = new Map(DEFAULT_DATABASE.units.map((u) => [u.id, u]));
const BUILDING_SPEC_BY_ID = new Map(DEFAULT_DATABASE.buildings.map((b) => [b.id, b]));
const WEAPON_SPEC_BY_ID = new Map(DEFAULT_DATABASE.weapons.map((w) => [w.id, w]));

export class GameSimulation {
  public tickIndex: number = 0;
  public seed: number;
  public prng: Mulberry32PRNG;
  public spatialGrid: SpatialHashGrid<SimEntity>;
  public fogOfWar: FogOfWarManager;
  public navigation: NavigationService;
  public superweaponManager: SuperweaponManager = new SuperweaponManager();
  public entities: Map<number, SimEntity> = new Map();
  public players: PlayerEconomyState[] = [];
  public resourceNodes: Map<string, ResourceNodeState> = new Map();
  public aiAgents: Map<number, SkirmishAIAgent> = new Map();
  public playerTeams: number[] = [];
  public playerFactions: FactionId[] = [];
  public surrenderedPlayers: Set<number> = new Set();
  private pendingShotFX: { startX: number; startY: number; targetX: number; targetY: number }[] = [];

  public nextEntityId: number = 1;
  public matchState: MatchState = MatchState.IN_GAME;
  public winnerTeam: number = -1;
  /** Map dimensions in grid tiles (1 tile = 1000 scaled units). */
  public mapWidth: number;
  public mapHeight: number;

  constructor(seed: number = 1337, mapWidth?: number, mapHeight?: number) {
    this.seed = seed;
    this.mapWidth = mapWidth ?? DEFAULT_DATABASE.maps[0].width;
    this.mapHeight = mapHeight ?? DEFAULT_DATABASE.maps[0].height;
    this.prng = new Mulberry32PRNG(seed);
    this.spatialGrid = new SpatialHashGrid<SimEntity>(4000, this.mapWidth * 1000);
    this.fogOfWar = new FogOfWarManager(this.mapWidth, this.mapHeight);
    this.navigation = new NavigationService(this.mapWidth, this.mapHeight);
  }

  public initMatch(playerConfigs: { name: string; factionId: FactionId; type: PlayerType; team: number }[], startingCredits: number = 10000): void {
    this.tickIndex = 0;
    this.cachedTeamList = null;
    this.entities.clear();
    this.players = [];
    this.resourceNodes.clear();
    this.aiAgents.clear();
    this.superweaponManager.superweaponStates.clear();
    this.surrenderedPlayers.clear();
    this.pendingShotFX = [];
    this.matchState = MatchState.IN_GAME;
    this.winnerTeam = -1;
    this.nextEntityId = 1;
    this.playerTeams = playerConfigs.map(config => config.team);
    this.playerFactions = playerConfigs.map(config => config.factionId);
    this.players = playerConfigs.map(cfg => ({
      credits: startingCredits,
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
      this.superweaponManager.initPlayerSuperweapons(idx, p.factionId);
      if (p.type !== PlayerType.HUMAN && p.type !== PlayerType.SPECTATOR) {
        const difficulty = p.type === PlayerType.AI_EASY
          ? 'EASY'
          : p.type === PlayerType.AI_MEDIUM
            ? 'NORMAL'
            : 'HARD_FAIR';
        this.aiAgents.set(idx, new SkirmishAIAgent(idx, p.factionId, difficulty, 'ADAPTIVE', p.team));
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

      // Start with a usable RTS base so the player can command units immediately.
      this.spawnBuilding(faction.hqBuildingId, idx, sp.x * 1000, sp.y * 1000);
      this.spawnBuilding(faction.refineryBuildingId, idx, (sp.x + 5) * 1000, sp.y * 1000);
      this.spawnBuilding(faction.barracksBuildingId, idx, (sp.x - 5) * 1000, sp.y * 1000);
      this.spawnBuilding(faction.factoryBuildingId, idx, sp.x * 1000, (sp.y + 5) * 1000);
      this.spawnBuilding(faction.techBuildingId, idx, (sp.x + 5) * 1000, (sp.y + 5) * 1000);

      // Spawn Starting Harvester
      const harvestSpec = DEFAULT_DATABASE.units.find(u => u.factionId === p.factionId && u.harvesterCapacity)!;
      if (harvestSpec) {
        this.spawnUnit(harvestSpec.id, idx, (sp.x + 3) * 1000, (sp.y + 3) * 1000);
      }
    });

    this.recalculateEconomy();
  }

  public spawnBuilding(specId: string, playerIndex: number, x: number, y: number): number {
    const spec = BUILDING_SPEC_BY_ID.get(specId)!;
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
      disabledTicksRemaining: 0,
      attackCooldown: 0,
      sightRange: spec.sightRange,
      weaponId: spec.weaponId,
      moveSpeed: 0,
      currentOre: 0,
      maxOre: 0,
      harvestTimer: 0,
      productionQueue: [],
      gridWidth: spec.gridWidth,
      gridHeight: spec.gridHeight
    };

    this.entities.set(id, entity);
    this.navigation.registerObstacle(Math.floor(x / 1000), Math.floor(y / 1000), spec.gridWidth, spec.gridHeight);
    this.recalculateEconomy();
    return id;
  }

  public spawnUnit(specId: string, playerIndex: number, x: number, y: number): number {
    const spec = UNIT_SPEC_BY_ID.get(specId)!;
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
      disabledTicksRemaining: 0,
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
      case CommandType.MOVE:
      case CommandType.ATTACK_MOVE: {
        const movableEntities = cmd.entityIds
          .map(id => this.entities.get(id))
          .filter((e): e is SimEntity => !!e && e.playerIndex === cmd.playerIndex && !e.isBuilding);

        if (movableEntities.length > 0) {
          // Deterministic processing order regardless of input entityIds order.
          movableEntities.sort((a, b) => a.id - b.id);

          if (movableEntities.length > 8) {
            // Large group: shared flow field toward the goal — O(cells) once,
            // then O(1) steering per unit per tick.
            const field = this.navigation.getFlowField(cmd.targetX, cmd.targetY);
            const targets = this.navigation.calculateGroupFormations(cmd.targetX, cmd.targetY, movableEntities.length);
            movableEntities.forEach((e, idx) => {
              const targetPos = targets[idx] ?? { x: cmd.targetX, y: cmd.targetY };
              e.targetX = targetPos.x;
              e.targetY = targetPos.y;
              e.targetEntityId = undefined;
              e.waypoints = undefined;
              if (field && this.navigation.isReachable(field, e.x, e.y)) {
                e.flowGoalX = field.goalX * 1000 + 500;
                e.flowGoalY = field.goalY * 1000 + 500;
              } else {
                e.flowGoalX = undefined;
                e.flowGoalY = undefined;
                e.waypoints = this.navigation.findPath(e.x, e.y, targetPos.x, targetPos.y);
              }
            });
          } else {
            const targets = this.navigation.calculateGroupFormations(cmd.targetX, cmd.targetY, movableEntities.length);
            movableEntities.forEach((e, idx) => {
              const targetPos = targets[idx] ?? { x: cmd.targetX, y: cmd.targetY };
              e.targetX = targetPos.x;
              e.targetY = targetPos.y;
              e.flowGoalX = undefined;
              e.flowGoalY = undefined;
              e.waypoints = this.navigation.findPath(e.x, e.y, targetPos.x, targetPos.y);
              e.targetEntityId = undefined;
            });
          }
        }
        break;
      }
      case CommandType.ATTACK: {
        const target = this.entities.get(cmd.targetEntityId);
        if (!target || target.hp <= 0) break;
        for (const id of cmd.entityIds) {
          const e = this.entities.get(id);
          if (e && e.playerIndex === cmd.playerIndex && !e.isBuilding && this.isEnemy(e, target)) {
            e.targetEntityId = cmd.targetEntityId;
            e.targetX = undefined;
            e.targetY = undefined;
            e.waypoints = undefined;
            e.flowGoalX = undefined;
            e.flowGoalY = undefined;
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
            e.flowGoalX = undefined;
            e.flowGoalY = undefined;
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
          const unitSpec = UNIT_SPEC_BY_ID.get(cmd.unitId);
          const producerSpec = BUILDING_SPEC_BY_ID.get(producer.specId);
          const ownedSpecIds = new Set(
            Array.from(this.entities.values())
              .filter(entity => entity.playerIndex === cmd.playerIndex)
              .map(entity => entity.specId)
          );
          const prerequisitesMet = unitSpec?.prerequisites.every(id => ownedSpecIds.has(id)) ?? false;
          const compatibleProducer = producerSpec?.producesCategory === unitSpec?.category;
          if (
            unitSpec &&
            unitSpec.factionId === producer.factionId &&
            unitSpec.tier <= p.techTier &&
            prerequisitesMet &&
            compatibleProducer &&
            p.credits >= unitSpec.cost &&
            (p.commandCapUsed + unitSpec.commandCapCost) <= p.commandCapMax
          ) {
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
        const structSpec = BUILDING_SPEC_BY_ID.get(cmd.structureId);
        if (!structSpec) break;
        const ownedSpecIds = new Set(
          Array.from(this.entities.values())
            .filter((entity) => entity.playerIndex === cmd.playerIndex)
            .map((entity) => entity.specId)
        );
        const canBuild = structSpec.factionId === this.playerFactions[cmd.playerIndex]
          && structSpec.prerequisites.every((id) => ownedSpecIds.has(id))
          && p.credits >= structSpec.cost
          && this.isBuildLocationValid(structSpec, cmd.gridX, cmd.gridY);
        if (canBuild) {
          p.credits -= structSpec.cost;
          this.spawnBuilding(cmd.structureId, cmd.playerIndex, cmd.gridX * 1000, cmd.gridY * 1000);
        }
        break;
      }
      case CommandType.USE_ABILITY: {
        this.superweaponManager.executeSuperweaponCommand(this, cmd);
        break;
      }
      case CommandType.SURRENDER: {
        this.surrenderedPlayers.add(cmd.playerIndex);
        break;
      }
      case CommandType.CANCEL_PRODUCTION: {
        const producer = this.entities.get(cmd.producerEntityId);
        if (producer && producer.playerIndex === cmd.playerIndex) {
          const index = cmd.queueIndex;
          if (index >= 0 && index < producer.productionQueue.length) {
            const item = producer.productionQueue.splice(index, 1)[0];
            if (item) {
              this.players[cmd.playerIndex].credits += item.costPaid;
              this.recalculateEconomy();
            }
          }
        }
        break;
      }
      case CommandType.HOLD:
      case CommandType.SELL_STRUCTURE:
      case CommandType.REPAIR_STRUCTURE:
      case CommandType.CAPTURE_BUILDING:
      // PATROL/GUARD are accepted by the protocol; simulation behavior
      // lands with the formation/stance system (tracked in roadmap).
      case CommandType.PATROL:
      case CommandType.GUARD:
        break;
      default:
        assertNever(cmd);
    }
  }

  private isBuildLocationValid(structSpec: { gridWidth: number; gridHeight: number }, gridX: number, gridY: number): boolean {
    const halfWidth = Math.max(1, Math.ceil(structSpec.gridWidth / 2));
    const halfHeight = Math.max(1, Math.ceil(structSpec.gridHeight / 2));
    if (gridX - halfWidth < 1 || gridY - halfHeight < 1 || gridX + halfWidth > this.mapWidth - 1 || gridY + halfHeight > this.mapHeight - 1) return false;

    return !Array.from(this.entities.values()).some((entity) => {
      if (!entity.isBuilding) return false;
      const existingSpec = BUILDING_SPEC_BY_ID.get(entity.specId);
      if (!existingSpec) return false;
      const existingHalfWidth = Math.max(1, Math.ceil(existingSpec.gridWidth / 2));
      const existingHalfHeight = Math.max(1, Math.ceil(existingSpec.gridHeight / 2));
      const existingX = entity.x / 1000;
      const existingY = entity.y / 1000;
      return Math.abs(existingX - gridX) < existingHalfWidth + halfWidth
        && Math.abs(existingY - gridY) < existingHalfHeight + halfHeight;
    });
  }

  public step(): WorldSnapshot {
    this.tickIndex++;
    this.pendingShotFX = [];
    this.superweaponManager.update(this);
    this.updateFogOfWar();

    // 0. AI Agents Decision Loop
    if (this.matchState === MatchState.IN_GAME) {
      for (const agent of this.aiAgents.values()) {
        const aiCmds = agent.update(this);
        this.processCommands(aiCmds);
      }
    }

    // 1. Spatial Grid Reset
    this.spatialGrid.clear();
    for (const e of this.entities.values()) {
      this.spatialGrid.insert(e); // entity references — zero per-tick allocation
    }

    // 2. Production Queues
    for (const e of this.entities.values()) {
      if (e.productionQueue.length > 0 && e.isPowered) {
        const item = e.productionQueue[0];
        const p = this.players[e.playerIndex];
        const unitSpec = UNIT_SPEC_BY_ID.get(item.specId);
        if (unitSpec) {
          if (item.progressTicks >= item.totalTicks) {
            if (p.commandCapUsed + unitSpec.commandCapCost <= p.commandCapMax) {
              e.productionQueue.shift();
              p.commandCapUsed += unitSpec.commandCapCost;
              this.spawnUnit(item.specId, e.playerIndex, Math.min(e.x + 2000, (this.mapWidth - 1) * 1000), Math.min(e.y + 2000, (this.mapHeight - 1) * 1000));
            }
          } else {
            item.progressTicks++;
          }
        } else {
          e.productionQueue.shift(); // Invalid spec, discard
        }
      }
    }

    // 3. Movement Logic with Waypoints
    for (const e of this.entities.values()) {
      if (e.disabledTicksRemaining > 0) {
        e.disabledTicksRemaining--;
        e.isDisabled = e.disabledTicksRemaining > 0;
      }
      if (!e.isBuilding) {
        if (e.isDisabled) continue;
        let currTargetX = e.targetX;
        let currTargetY = e.targetY;

        // Flow-field steering for large-group movement: follow the shared
        // field until close to the formation slot, then home in directly.
        if (e.flowGoalX !== undefined && e.flowGoalY !== undefined && e.targetX !== undefined && e.targetY !== undefined) {
          const distToSlotSq = fixedDistanceSq(e.x, e.y, e.targetX, e.targetY);
          if (distToSlotSq > 3000 * 3000) {
            const field = this.navigation.getFlowField(e.flowGoalX, e.flowGoalY);
            const flow = field ? this.navigation.sampleFlow(field, e.x, e.y) : null;
            if (flow) {
              currTargetX = e.x + flow.dx * 1000;
              currTargetY = e.y + flow.dy * 1000;
            }
          } else {
            e.flowGoalX = undefined;
            e.flowGoalY = undefined;
          }
        } else if (e.waypoints && e.waypoints.length > 0) {
          currTargetX = e.waypoints[0].x;
          currTargetY = e.waypoints[0].y;
        }

        // Escape override: a unit standing on a blocked tile (e.g. spawned
        // inside a building footprint) must first head to the nearest
        // walkable tile before pursuing its actual goal.
        if (currTargetX !== undefined && currTargetY !== undefined && !this.navigation.isWalkableWorld(e.x, e.y)) {
          const near = this.navigation.findNearestWalkableTile(Math.floor(e.x / 1000), Math.floor(e.y / 1000));
          if (near) {
            currTargetX = near.x * 1000 + 500;
            currTargetY = near.y * 1000 + 500;
          }
        }

        if (currTargetX !== undefined && currTargetY !== undefined) {
          const distSq = fixedDistanceSq(e.x, e.y, currTargetX, currTargetY);
          const stepDistSq = e.moveSpeed * e.moveSpeed;

          if (distSq <= stepDistSq) {
            e.x = currTargetX;
            e.y = currTargetY;
            if (e.flowGoalX !== undefined) {
              // Reached an intermediate flow step — keep following the field.
            } else if (e.waypoints && e.waypoints.length > 0) {
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
            let dx = (currTargetX - e.x) / dist;
            let dy = (currTargetY - e.y) / dist;

            // Soft collision avoidance (Boids separation) — allocation-free scan
            let pushAccX = 0;
            let pushAccY = 0;
            this.spatialGrid.forEachInRadius(e.x, e.y, 1500, (neighbor) => {
              if (neighbor.id === e.id || neighbor.isBuilding || neighbor.hp <= 0) return;
              const ndx = e.x - neighbor.x;
              const ndy = e.y - neighbor.y;
              const nDistSq = ndx * ndx + ndy * ndy;
              if (nDistSq > 0 && nDistSq < 1500 * 1500) {
                const nDist = Math.sqrt(nDistSq);
                const strength = 1 - (nDist / 1500);
                pushAccX += (ndx / nDist) * strength * 0.6;
                pushAccY += (ndy / nDist) * strength * 0.6;
              }
            });
            dx += pushAccX;
            dy += pushAccY;

            // Normalize direction after repulsion
            const mag = Math.sqrt(dx * dx + dy * dy);
            if (mag > 0) {
              dx /= mag;
              dy /= mag;
            }

            const nextX = e.x + Math.round(dx * e.moveSpeed);
            const nextY = e.y + Math.round(dy * e.moveSpeed);
            // Hard constraint: never step into a blocked tile (buildings/terrain).
            // Exception: a unit currently standing on a blocked tile (e.g. it
            // spawned inside a footprint) may move freely so it can escape.
            if (!this.navigation.isWalkableWorld(e.x, e.y) || this.navigation.isWalkableWorld(nextX, nextY)) {
              e.x = nextX;
              e.y = nextY;
            } else if (this.navigation.isWalkableWorld(nextX, e.y)) {
              e.x = nextX; // slide along Y-blocked edge
            } else if (this.navigation.isWalkableWorld(e.x, nextY)) {
              e.y = nextY; // slide along X-blocked edge
            }
            // else: fully blocked this tick — hold position (avoidance/path will resolve)
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
              e.waypoints = this.navigation.findPath(e.x, e.y, e.targetX, e.targetY);
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
                e.waypoints = this.navigation.findPath(e.x, e.y, e.targetX, e.targetY);
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

      if (e.weaponId && e.attackCooldown === 0 && !e.isDisabled) {
        const weapon = WEAPON_SPEC_BY_ID.get(e.weaponId);
        if (!weapon) continue;

        let target: SimEntity | undefined;

        if (e.targetEntityId) {
          target = this.entities.get(e.targetEntityId);
          if (!target || target.hp <= 0 || !this.isEnemy(e, target)) {
            e.targetEntityId = undefined;
            target = undefined;
          }
        }

        // Deterministic retarget throttling: an idle armed entity rescans for
        // targets every 5 ticks, staggered by id, instead of every tick. This
        // caps worst-case targeting cost at ~20% of armed entities per tick.
        if (!target && (this.tickIndex + e.id) % 5 !== 0) {
          continue;
        }

        if (!target) {
          // Auto-target nearest enemy — allocation-free scan with deterministic
          // tie-breaking (strictly smaller distance wins; equal distance keeps
          // the earlier-visited candidate, and bucket order is insertion order).
          let minDistSq = weapon.range * weapon.range;
          let best: SimEntity | undefined;
          this.spatialGrid.forEachInRadius(e.x, e.y, weapon.range, (cand) => {
            if (cand.hp > 0 && this.isEnemy(e, cand)) {
              const cdx = e.x - cand.x;
              const cdy = e.y - cand.y;
              const dSq = cdx * cdx + cdy * cdy;
              if (dSq < minDistSq || (dSq === minDistSq && best === undefined)) {
                minDistSq = dSq;
                best = cand;
              }
            }
          });
          target = best;
        }

        if (target && target.hp > 0) {
          const dSq = fixedDistanceSq(e.x, e.y, target.x, target.y);
          if (dSq <= weapon.range * weapon.range) {
            // Fire weapon
            e.attackCooldown = weapon.cooldownTicks;
            this.pendingShotFX.push({ startX: e.x, startY: e.y, targetX: target.x, targetY: target.y });
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
              this.removeEntity(target.id);
              e.expEarned += 10;
              if (e.expEarned >= 50 && e.veterancy < VeterancyRank.Heroic) {
                e.veterancy = Math.min(VeterancyRank.Heroic, e.veterancy + 1);
              }
            }
          } else if (!e.isBuilding) {
            // Move into attack range
            const targetDistSq = e.targetX !== undefined && e.targetY !== undefined
              ? fixedDistanceSq(e.targetX, e.targetY, target.x, target.y)
              : Infinity;

            if (e.targetX === undefined || targetDistSq > 2000 * 2000) {
              e.targetX = target.x;
              e.targetY = target.y;
              e.waypoints = this.navigation.findPath(e.x, e.y, e.targetX, e.targetY);
            }
          }
        }
      }
    }

    // 6. Recalculate Power Grid & Victory
    this.recalculateEconomy();
    this.checkVictory();

    return this.createSnapshot();
  }

  /** Remove an entity, unregistering building obstacles from the nav grid. */
  public removeEntity(id: number): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    if (entity.isBuilding && entity.gridWidth && entity.gridHeight) {
      this.navigation.unregisterObstacle(Math.floor(entity.x / 1000), Math.floor(entity.y / 1000), entity.gridWidth, entity.gridHeight);
    }
    this.entities.delete(id);
  }

  public recalculateEconomy(): void {
    // Purge any dead entities (hp <= 0)
    for (const [id, entity] of Array.from(this.entities.entries())) {
      if (entity.hp <= 0) {
        this.removeEntity(id);
      }
    }

    for (let pIdx = 0; pIdx < this.players.length; pIdx++) {
      const p = this.players[pIdx];
      let powerProduced = 100;
      let powerConsumed = 0;
      let commandCapUsed = 0;
      let commandCapMax = 50;
      let hasHQ = false;
      let techTier = TechTier.T1;

      for (const e of this.entities.values()) {
        if (e.playerIndex === pIdx && e.hp > 0) {
          if (!this.surrenderedPlayers.has(pIdx) && e.isBuilding && e.category === BuildingCategory.HQ) hasHQ = true;
          if (e.isBuilding) {
            const spec = BUILDING_SPEC_BY_ID.get(e.specId);
            if (spec) {
              powerProduced += spec.powerProduced;
              powerConsumed += spec.powerConsumed;
              commandCapMax += spec.commandCapGranted;
              techTier = Math.max(techTier, spec.tier) as TechTier;
            }
            if (e.productionQueue && e.productionQueue.length > 0) {
              for (const item of e.productionQueue) {
                const unitSpec = UNIT_SPEC_BY_ID.get(item.specId);
                if (unitSpec) {
                  commandCapUsed += unitSpec.commandCapCost;
                }
              }
            }
          } else {
            const spec = UNIT_SPEC_BY_ID.get(e.specId);
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
      p.techTier = techTier;
      p.hasHQ = hasHQ;
    }
  }

  private cachedTeamList: number[] | null = null;

  private updateFogOfWar(): void {
    // FoW refresh every 3 ticks (100 ms of game time) — visibility changes
    // slower than movement; deterministic because it depends only on tickIndex.
    if (this.tickIndex % 3 !== 1 && this.tickIndex > 1) return;

    if (!this.cachedTeamList) {
      this.cachedTeamList = Array.from(new Set(this.playerTeams)).sort((a, b) => a - b);
    }
    const teams = this.cachedTeamList;
    for (const team of teams) this.fogOfWar.resetVisibility(team);

    for (const entity of this.entities.values()) {
      const team = this.playerTeams[entity.playerIndex];
      if (team === undefined) continue;
      this.fogOfWar.revealCircle(
        team,
        Math.floor(entity.x / 1000),
        Math.floor(entity.y / 1000),
        Math.ceil(entity.sightRange / 1000)
      );
    }
  }

  public checkVictory(): void {
    const activeTeams = new Set<number>();
    this.players.forEach((p, idx) => {
      if (p.hasHQ) {
        activeTeams.add(this.playerTeams[idx] ?? idx);
      }
    });

    if (activeTeams.size === 1 && this.matchState === MatchState.IN_GAME) {
      this.matchState = MatchState.FINISHED;
      this.winnerTeam = Array.from(activeTeams)[0];
    } else if (activeTeams.size === 0 && this.matchState === MatchState.IN_GAME) {
      // Mutual destruction — team 0 (player) loses
      this.matchState = MatchState.FINISHED;
      this.winnerTeam = 1;
    }
  }

  private isEnemy(source: SimEntity, target: SimEntity): boolean {
    return this.playerTeams[source.playerIndex] !== this.playerTeams[target.playerIndex];
  }

  /**
   * Full-state checksum (checksum format v2).
   *
   * Covers: tick, seed, PRNG state, per-entity spatial + combat + economy +
   * production state, and per-player economy. Entity iteration order is
   * insertion order of the Map, which is identical across environments
   * because entity ids are allocated deterministically.
   */
  public calculateChecksum(): number {
    let hash = this.tickIndex ^ this.seed;
    const mix = (v: number): void => {
      hash = ((hash << 5) - hash) + (v | 0);
      hash |= 0;
    };

    mix(this.prng.getSeedState());
    mix(this.matchState === MatchState.FINISHED ? 0x5150 + this.winnerTeam : 0);

    for (const e of this.entities.values()) {
      mix(e.id); mix(e.x); mix(e.y); mix(e.hp); mix(e.currentOre);
      mix(e.shield);
      mix(e.attackCooldown);
      mix(e.veterancy);
      mix(e.expEarned);
      mix(e.isPowered ? 1 : 0);
      mix(e.disabledTicksRemaining);
      mix(e.targetEntityId ?? -1);
      mix(e.targetX ?? -1); mix(e.targetY ?? -1);
      for (const item of e.productionQueue) {
        mix(item.progressTicks); mix(item.costPaid);
        // Cheap deterministic string hash of the queued spec id
        let sh = 0;
        for (let i = 0; i < item.specId.length; i++) sh = ((sh << 5) - sh + item.specId.charCodeAt(i)) | 0;
        mix(sh);
      }
    }

    for (const p of this.players) {
      mix(p.credits); mix(p.powerProduced); mix(p.powerConsumed);
      mix(p.commandCapUsed); mix(p.hasHQ ? 1 : 0);
    }

    for (const rn of this.resourceNodes.values()) {
      mix(rn.creditsRemaining);
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
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      entities: entitySnapshots,
      players: this.players,
      shotFX: this.pendingShotFX.length > 0 ? [...this.pendingShotFX] : undefined
    };
  }
}
