import { assertNever, BuildingCategory, CommandType, MatchState, OrderMode, PlayerType, TechTier, UnitStance, VeterancyRank } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { Mulberry32PRNG } from './prng.js';
import { SpatialHashGrid } from './spatialGrid.js';
import { FogOfWarManager } from './fogOfWar.js';
import { calculateDamage } from './combat.js';
import { fixedDistanceSq } from './fixedMath.js';
import { NavigationService } from './navigation.js';
import { SkirmishAIAgent } from './aiAgent.js';
import { SuperweaponManager } from './superweaponManager.js';
// O(1) content lookup maps (content is immutable at runtime).
const UNIT_SPEC_BY_ID = new Map(DEFAULT_DATABASE.units.map((u) => [u.id, u]));
const BUILDING_SPEC_BY_ID = new Map(DEFAULT_DATABASE.buildings.map((b) => [b.id, b]));
const WEAPON_SPEC_BY_ID = new Map(DEFAULT_DATABASE.weapons.map((w) => [w.id, w]));
export class GameSimulation {
    tickIndex = 0;
    seed;
    prng;
    spatialGrid;
    fogOfWar;
    navigation;
    superweaponManager = new SuperweaponManager();
    entities = new Map();
    players = [];
    resourceNodes = new Map();
    aiAgents = new Map();
    playerTeams = [];
    playerFactions = [];
    surrenderedPlayers = new Set();
    pendingShotFX = [];
    nextEntityId = 1;
    matchState = MatchState.IN_GAME;
    winnerTeam = -1;
    /** Map dimensions in grid tiles (1 tile = 1000 scaled units). */
    mapWidth;
    mapHeight;
    /** Content id of the map this match is played on. */
    mapId;
    constructor(seed = 1337, mapWidth, mapHeight, mapId) {
        this.seed = seed;
        const map = mapId
            ? DEFAULT_DATABASE.maps.find((m) => m.id === mapId) ?? DEFAULT_DATABASE.maps[0]
            : DEFAULT_DATABASE.maps[0];
        this.mapId = map.id;
        this.mapWidth = mapWidth ?? map.width;
        this.mapHeight = mapHeight ?? map.height;
        this.prng = new Mulberry32PRNG(seed);
        this.spatialGrid = new SpatialHashGrid(4000, this.mapWidth * 1000);
        this.fogOfWar = new FogOfWarManager(this.mapWidth, this.mapHeight);
        this.navigation = new NavigationService(this.mapWidth, this.mapHeight);
    }
    initMatch(playerConfigs, startingCredits = 10000) {
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
        // Spawn Resource Nodes from the match's map (selected by id in the ctor)
        const defaultMap = DEFAULT_DATABASE.maps.find((m) => m.id === this.mapId) ?? DEFAULT_DATABASE.maps[0];
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
            const faction = DEFAULT_DATABASE.factions.find(f => f.id === p.factionId);
            // Start with a usable RTS base so the player can command units immediately.
            this.spawnBuilding(faction.hqBuildingId, idx, sp.x * 1000, sp.y * 1000);
            this.spawnBuilding(faction.refineryBuildingId, idx, (sp.x + 5) * 1000, sp.y * 1000);
            this.spawnBuilding(faction.barracksBuildingId, idx, (sp.x - 5) * 1000, sp.y * 1000);
            this.spawnBuilding(faction.factoryBuildingId, idx, sp.x * 1000, (sp.y + 5) * 1000);
            this.spawnBuilding(faction.techBuildingId, idx, (sp.x + 5) * 1000, (sp.y + 5) * 1000);
            // Spawn Starting Harvester
            const harvestSpec = DEFAULT_DATABASE.units.find(u => u.factionId === p.factionId && u.harvesterCapacity);
            if (harvestSpec) {
                this.spawnUnit(harvestSpec.id, idx, (sp.x + 3) * 1000, (sp.y + 3) * 1000);
            }
        });
        this.recalculateEconomy();
    }
    spawnBuilding(specId, playerIndex, x, y) {
        const spec = BUILDING_SPEC_BY_ID.get(specId);
        const id = this.nextEntityId++;
        const entity = {
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
            // Buildings defend themselves but obviously never leave their post.
            stance: UnitStance.DEFENSIVE,
            orderMode: OrderMode.NONE,
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
    spawnUnit(specId, playerIndex, x, y) {
        const spec = UNIT_SPEC_BY_ID.get(specId);
        const id = this.nextEntityId++;
        const entity = {
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
            // Units default to aggressive: they engage and pursue what they see,
            // which is the classic RTS default. HOLD/GUARD/DEFENSIVE are explicit.
            stance: UnitStance.AGGRESSIVE,
            orderMode: OrderMode.NONE,
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
    processCommands(commands) {
        for (const cmd of commands) {
            this.executeCommand(cmd);
        }
    }
    executeCommand(cmd) {
        const p = this.players[cmd.playerIndex];
        if (!p)
            return;
        switch (cmd.type) {
            case CommandType.MOVE:
            case CommandType.ATTACK_MOVE: {
                const movableEntities = cmd.entityIds
                    .map(id => this.entities.get(id))
                    .filter((e) => !!e && e.playerIndex === cmd.playerIndex && !e.isBuilding);
                if (movableEntities.length > 0) {
                    // Deterministic processing order regardless of input entityIds order.
                    movableEntities.sort((a, b) => a.id - b.id);
                    // A fresh move/attack-move replaces any standing order, otherwise a
                    // previous patrol/guard would keep overriding the new destination.
                    const nextMode = cmd.type === CommandType.ATTACK_MOVE ? OrderMode.ATTACK_MOVE : OrderMode.NONE;
                    for (const e of movableEntities) {
                        this.clearOrders(e);
                        e.orderMode = nextMode;
                    }
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
                            }
                            else {
                                e.flowGoalX = undefined;
                                e.flowGoalY = undefined;
                                e.waypoints = this.navigation.findPath(e.x, e.y, targetPos.x, targetPos.y);
                            }
                        });
                    }
                    else {
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
                if (!target || target.hp <= 0)
                    break;
                for (const id of cmd.entityIds) {
                    const e = this.entities.get(id);
                    if (e && e.playerIndex === cmd.playerIndex && !e.isBuilding && this.isEnemy(e, target)) {
                        // An explicit attack order overrides any standing order.
                        this.clearOrders(e);
                        e.targetEntityId = cmd.targetEntityId;
                    }
                }
                break;
            }
            case CommandType.STOP: {
                for (const id of cmd.entityIds) {
                    const e = this.entities.get(id);
                    if (e && e.playerIndex === cmd.playerIndex) {
                        this.clearOrders(e);
                    }
                }
                break;
            }
            case CommandType.HOLD: {
                // Hold position: fight from where you stand, never pursue. The current
                // position becomes the post the entity must not leave.
                for (const id of cmd.entityIds) {
                    const e = this.entities.get(id);
                    if (e && e.playerIndex === cmd.playerIndex && !e.isBuilding) {
                        this.clearOrders(e);
                        e.orderMode = OrderMode.HOLD;
                        e.postX = e.x;
                        e.postY = e.y;
                    }
                }
                break;
            }
            case CommandType.PATROL: {
                const units = cmd.entityIds
                    .map((id) => this.entities.get(id))
                    .filter((e) => !!e && e.playerIndex === cmd.playerIndex && !e.isBuilding)
                    .sort((a, b) => a.id - b.id); // deterministic order
                for (const e of units) {
                    if (cmd.append && e.orderMode === OrderMode.PATROL && e.patrolRoute) {
                        e.patrolRoute.push({ x: cmd.targetX, y: cmd.targetY });
                    }
                    else {
                        // A new patrol runs between the current position and the target,
                        // so a single click already produces a real back-and-forth route.
                        this.clearOrders(e);
                        e.orderMode = OrderMode.PATROL;
                        e.patrolRoute = [{ x: e.x, y: e.y }, { x: cmd.targetX, y: cmd.targetY }];
                        e.patrolIndex = 1;
                        this.setMoveDestination(e, cmd.targetX, cmd.targetY);
                    }
                }
                break;
            }
            case CommandType.GUARD: {
                const units = cmd.entityIds
                    .map((id) => this.entities.get(id))
                    .filter((e) => !!e && e.playerIndex === cmd.playerIndex && !e.isBuilding)
                    .sort((a, b) => a.id - b.id);
                for (const e of units) {
                    const guarded = cmd.targetEntityId !== undefined ? this.entities.get(cmd.targetEntityId) : undefined;
                    // Guarding an enemy is meaningless; ignore rather than half-apply.
                    if (guarded && this.isEnemy(e, guarded))
                        continue;
                    this.clearOrders(e);
                    e.orderMode = OrderMode.GUARD;
                    if (guarded) {
                        e.guardEntityId = guarded.id;
                        e.postX = guarded.x;
                        e.postY = guarded.y;
                    }
                    else {
                        e.postX = cmd.targetX ?? e.x;
                        e.postY = cmd.targetY ?? e.y;
                        if (cmd.targetX !== undefined && cmd.targetY !== undefined) {
                            this.setMoveDestination(e, cmd.targetX, cmd.targetY);
                        }
                    }
                }
                break;
            }
            case CommandType.SET_STANCE: {
                for (const id of cmd.entityIds) {
                    const e = this.entities.get(id);
                    if (e && e.playerIndex === cmd.playerIndex) {
                        e.stance = cmd.stance;
                        // Dropping out of hold-fire must not keep a stale forced target.
                        if (cmd.stance === UnitStance.HOLD_FIRE)
                            e.targetEntityId = undefined;
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
                    const ownedSpecIds = new Set(Array.from(this.entities.values())
                        .filter(entity => entity.playerIndex === cmd.playerIndex)
                        .map(entity => entity.specId));
                    const prerequisitesMet = unitSpec?.prerequisites.every(id => ownedSpecIds.has(id)) ?? false;
                    const compatibleProducer = producerSpec?.producesCategory === unitSpec?.category;
                    if (unitSpec &&
                        unitSpec.factionId === producer.factionId &&
                        unitSpec.tier <= p.techTier &&
                        prerequisitesMet &&
                        compatibleProducer &&
                        p.credits >= unitSpec.cost &&
                        (p.commandCapUsed + unitSpec.commandCapCost) <= p.commandCapMax) {
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
                if (!structSpec)
                    break;
                const ownedSpecIds = new Set(Array.from(this.entities.values())
                    .filter((entity) => entity.playerIndex === cmd.playerIndex)
                    .map((entity) => entity.specId));
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
            case CommandType.SELL_STRUCTURE:
            case CommandType.REPAIR_STRUCTURE:
            case CommandType.CAPTURE_BUILDING:
                break;
            default:
                assertNever(cmd);
        }
    }
    /**
     * Cancel every movement/attack/standing order, returning the entity to
     * plain idle. Stance is a persistent preference and is deliberately kept.
     */
    clearOrders(e) {
        e.targetX = undefined;
        e.targetY = undefined;
        e.targetEntityId = undefined;
        e.waypoints = undefined;
        e.flowGoalX = undefined;
        e.flowGoalY = undefined;
        e.orderMode = OrderMode.NONE;
        e.patrolRoute = undefined;
        e.patrolIndex = undefined;
        e.postX = undefined;
        e.postY = undefined;
        e.guardEntityId = undefined;
    }
    /** Path an entity toward a world position (single-unit path, no flow field). */
    setMoveDestination(e, x, y) {
        e.targetX = x;
        e.targetY = y;
        e.flowGoalX = undefined;
        e.flowGoalY = undefined;
        e.waypoints = this.navigation.findPath(e.x, e.y, x, y);
    }
    /**
     * How far an entity may stray from its post before it must return.
     *
     * HOLD units never leave at all; guards get a leash so they can meet an
     * attacker but still come back instead of being pulled across the map.
     */
    static GUARD_LEASH = 6000; // 6 tiles (scaled ints)
    /**
     * Advance standing orders once per tick, before movement executes.
     *
     * Iterates `this.entities` in insertion order (deterministic across
     * environments because ids are allocated deterministically) and only reads
     * simulation state — no wall clock, no unseeded randomness.
     */
    updateStandingOrders() {
        const ARRIVE_SQ = 900 * 900; // ~0.9 tile — "close enough" to a waypoint
        for (const e of this.entities.values()) {
            // Fast path: the vast majority of entities carry no standing order, so
            // skip them before any further checks (this runs every tick).
            if (e.orderMode === OrderMode.NONE || e.orderMode === OrderMode.ATTACK_MOVE)
                continue;
            if (e.isBuilding || e.isDisabled || e.hp <= 0)
                continue;
            switch (e.orderMode) {
                case OrderMode.HOLD: {
                    // A holding unit never travels. It may have acquired a target for
                    // firing, but must not be pulled out of position by it.
                    if (e.postX !== undefined && e.postY !== undefined) {
                        e.targetX = undefined;
                        e.targetY = undefined;
                        e.waypoints = undefined;
                        e.flowGoalX = undefined;
                        e.flowGoalY = undefined;
                    }
                    break;
                }
                case OrderMode.PATROL: {
                    const route = e.patrolRoute;
                    if (!route || route.length < 2)
                        break;
                    // Engaging an enemy suspends patrol travel until the fight resolves.
                    if (e.targetEntityId !== undefined && this.entities.has(e.targetEntityId))
                        break;
                    const idx = e.patrolIndex ?? 0;
                    const leg = route[idx % route.length];
                    const arrived = fixedDistanceSq(e.x, e.y, leg.x, leg.y) <= ARRIVE_SQ;
                    if (arrived) {
                        // Advance to the next leg, cycling the route forever.
                        const nextIdx = (idx + 1) % route.length;
                        e.patrolIndex = nextIdx;
                        const next = route[nextIdx];
                        this.setMoveDestination(e, next.x, next.y);
                    }
                    else if (e.targetX === undefined && e.targetY === undefined) {
                        // Re-issue the current leg after an interruption (e.g. combat).
                        this.setMoveDestination(e, leg.x, leg.y);
                    }
                    break;
                }
                case OrderMode.GUARD: {
                    // Guarding a unit means following it as it moves.
                    if (e.guardEntityId !== undefined) {
                        const guarded = this.entities.get(e.guardEntityId);
                        if (!guarded || guarded.hp <= 0) {
                            // The guarded entity died — drop to idle rather than guarding a ghost.
                            this.clearOrders(e);
                            break;
                        }
                        e.postX = guarded.x;
                        e.postY = guarded.y;
                    }
                    if (e.postX === undefined || e.postY === undefined)
                        break;
                    const distToPostSq = fixedDistanceSq(e.x, e.y, e.postX, e.postY);
                    const engaged = e.targetEntityId !== undefined && this.entities.has(e.targetEntityId);
                    const leashSq = GameSimulation.GUARD_LEASH * GameSimulation.GUARD_LEASH;
                    if (distToPostSq > leashSq) {
                        // Beyond the leash: abandon the chase and return to the post.
                        e.targetEntityId = undefined;
                        this.setMoveDestination(e, e.postX, e.postY);
                    }
                    else if (!engaged && distToPostSq > ARRIVE_SQ && e.targetX === undefined) {
                        // Idle and away from the post (post moved, or we drifted) — go back.
                        this.setMoveDestination(e, e.postX, e.postY);
                    }
                    break;
                }
            }
        }
    }
    isBuildLocationValid(structSpec, gridX, gridY) {
        const halfWidth = Math.max(1, Math.ceil(structSpec.gridWidth / 2));
        const halfHeight = Math.max(1, Math.ceil(structSpec.gridHeight / 2));
        if (gridX - halfWidth < 1 || gridY - halfHeight < 1 || gridX + halfWidth > this.mapWidth - 1 || gridY + halfHeight > this.mapHeight - 1)
            return false;
        return !Array.from(this.entities.values()).some((entity) => {
            if (!entity.isBuilding)
                return false;
            const existingSpec = BUILDING_SPEC_BY_ID.get(entity.specId);
            if (!existingSpec)
                return false;
            const existingHalfWidth = Math.max(1, Math.ceil(existingSpec.gridWidth / 2));
            const existingHalfHeight = Math.max(1, Math.ceil(existingSpec.gridHeight / 2));
            const existingX = entity.x / 1000;
            const existingY = entity.y / 1000;
            return Math.abs(existingX - gridX) < existingHalfWidth + halfWidth
                && Math.abs(existingY - gridY) < existingHalfHeight + halfHeight;
        });
    }
    step() {
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
                    }
                    else {
                        item.progressTicks++;
                    }
                }
                else {
                    e.productionQueue.shift(); // Invalid spec, discard
                }
            }
        }
        // 3. Standing Orders (patrol legs, guard leash, hold anchoring)
        this.updateStandingOrders();
        // 3b. Movement Logic with Waypoints
        for (const e of this.entities.values()) {
            if (e.disabledTicksRemaining > 0) {
                e.disabledTicksRemaining--;
                e.isDisabled = e.disabledTicksRemaining > 0;
            }
            if (!e.isBuilding) {
                if (e.isDisabled)
                    continue;
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
                    }
                    else {
                        e.flowGoalX = undefined;
                        e.flowGoalY = undefined;
                    }
                }
                else if (e.waypoints && e.waypoints.length > 0) {
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
                        }
                        else if (e.waypoints && e.waypoints.length > 0) {
                            e.waypoints.shift();
                            if (e.waypoints.length === 0) {
                                e.waypoints = undefined;
                                e.targetX = undefined;
                                e.targetY = undefined;
                            }
                        }
                        else {
                            e.targetX = undefined;
                            e.targetY = undefined;
                        }
                    }
                    else {
                        const dist = Math.sqrt(distSq);
                        let dx = (currTargetX - e.x) / dist;
                        let dy = (currTargetY - e.y) / dist;
                        // Soft collision avoidance (Boids separation) — allocation-free scan
                        let pushAccX = 0;
                        let pushAccY = 0;
                        this.spatialGrid.forEachInRadius(e.x, e.y, 1500, (neighbor) => {
                            if (neighbor.id === e.id || neighbor.isBuilding || neighbor.hp <= 0)
                                return;
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
                        }
                        else if (this.navigation.isWalkableWorld(nextX, e.y)) {
                            e.x = nextX; // slide along Y-blocked edge
                        }
                        else if (this.navigation.isWalkableWorld(e.x, nextY)) {
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
                    let nearestNode;
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
                        }
                        else if (e.targetX === undefined) {
                            e.targetX = nearestNode.x;
                            e.targetY = nearestNode.y;
                            e.waypoints = this.navigation.findPath(e.x, e.y, e.targetX, e.targetY);
                        }
                    }
                }
                else {
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
                            }
                            else if (e.targetX === undefined) {
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
                if (!weapon)
                    continue;
                let target;
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
                    // HOLD_FIRE never acquires targets on its own — it only fires at a
                    // target given by an explicit ATTACK order (set above).
                    if (e.stance === UnitStance.HOLD_FIRE)
                        continue;
                    // Auto-target nearest enemy — allocation-free scan with deterministic
                    // tie-breaking (strictly smaller distance wins; equal distance keeps
                    // the earlier-visited candidate, and bucket order is insertion order).
                    // Two-stage acquisition, for cost as much as for behavior:
                    //  1. cheap scan inside weapon range — the common case in a fight;
                    //  2. only if nothing is shootable, widen to sight range so the unit
                    //     can close on an enemy it can see but not yet hit.
                    // Anchored units (HOLD / DEFENSIVE) never run stage 2: they must not
                    // leave their post, so a target they cannot hit is of no use.
                    // Fog of war is not bypassed — sightRange is this entity's own vision.
                    const scan = (range) => {
                        let minDistSq = range * range;
                        let found;
                        this.spatialGrid.forEachInRadius(e.x, e.y, range, (cand) => {
                            if (cand.hp > 0 && this.isEnemy(e, cand)) {
                                const cdx = e.x - cand.x;
                                const cdy = e.y - cand.y;
                                const dSq = cdx * cdx + cdy * cdy;
                                if (dSq < minDistSq || (dSq === minDistSq && found === undefined)) {
                                    minDistSq = dSq;
                                    found = cand;
                                }
                            }
                        });
                        return found;
                    };
                    const anchored = e.stance === UnitStance.DEFENSIVE || e.orderMode === OrderMode.HOLD;
                    target = scan(weapon.range);
                    // Stage 2 is the expensive one (sight radius can be ~2x the weapon
                    // radius ⇒ ~4x the area), and it only decides whether to START
                    // closing in. Reached only when nothing is already shootable.
                    if (!target && !anchored && !e.isBuilding && e.sightRange > weapon.range) {
                        target = scan(e.sightRange);
                    }
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
                        }
                        else {
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
                    }
                    else if (!e.isBuilding) {
                        // Target is out of range. Whether we may chase it depends on the
                        // entity's standing order and stance — this is what makes HOLD and
                        // GUARD meaningful rather than cosmetic.
                        const mayPursue = e.orderMode !== OrderMode.HOLD
                            && e.stance !== UnitStance.DEFENSIVE
                            && !(e.orderMode === OrderMode.GUARD
                                && e.postX !== undefined && e.postY !== undefined
                                && fixedDistanceSq(target.x, target.y, e.postX, e.postY)
                                    > GameSimulation.GUARD_LEASH * GameSimulation.GUARD_LEASH);
                        if (!mayPursue) {
                            // Cannot reach it without abandoning our post: forget the target
                            // so we re-acquire something actually engageable next scan.
                            e.targetEntityId = undefined;
                        }
                        else {
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
        }
        // 6. Recalculate Power Grid & Victory
        this.recalculateEconomy();
        this.checkVictory();
        return this.createSnapshot();
    }
    /** Remove an entity, unregistering building obstacles from the nav grid. */
    removeEntity(id) {
        const entity = this.entities.get(id);
        if (!entity)
            return;
        if (entity.isBuilding && entity.gridWidth && entity.gridHeight) {
            this.navigation.unregisterObstacle(Math.floor(entity.x / 1000), Math.floor(entity.y / 1000), entity.gridWidth, entity.gridHeight);
        }
        this.entities.delete(id);
    }
    recalculateEconomy() {
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
                    if (!this.surrenderedPlayers.has(pIdx) && e.isBuilding && e.category === BuildingCategory.HQ)
                        hasHQ = true;
                    if (e.isBuilding) {
                        const spec = BUILDING_SPEC_BY_ID.get(e.specId);
                        if (spec) {
                            powerProduced += spec.powerProduced;
                            powerConsumed += spec.powerConsumed;
                            commandCapMax += spec.commandCapGranted;
                            techTier = Math.max(techTier, spec.tier);
                        }
                        if (e.productionQueue && e.productionQueue.length > 0) {
                            for (const item of e.productionQueue) {
                                const unitSpec = UNIT_SPEC_BY_ID.get(item.specId);
                                if (unitSpec) {
                                    commandCapUsed += unitSpec.commandCapCost;
                                }
                            }
                        }
                    }
                    else {
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
    cachedTeamList = null;
    updateFogOfWar() {
        // FoW refresh every 3 ticks (100 ms of game time) — visibility changes
        // slower than movement; deterministic because it depends only on tickIndex.
        if (this.tickIndex % 3 !== 1 && this.tickIndex > 1)
            return;
        if (!this.cachedTeamList) {
            this.cachedTeamList = Array.from(new Set(this.playerTeams)).sort((a, b) => a - b);
        }
        const teams = this.cachedTeamList;
        for (const team of teams)
            this.fogOfWar.resetVisibility(team);
        for (const entity of this.entities.values()) {
            const team = this.playerTeams[entity.playerIndex];
            if (team === undefined)
                continue;
            this.fogOfWar.revealCircle(team, Math.floor(entity.x / 1000), Math.floor(entity.y / 1000), Math.ceil(entity.sightRange / 1000));
        }
    }
    checkVictory() {
        const activeTeams = new Set();
        this.players.forEach((p, idx) => {
            if (p.hasHQ) {
                activeTeams.add(this.playerTeams[idx] ?? idx);
            }
        });
        if (activeTeams.size === 1 && this.matchState === MatchState.IN_GAME) {
            this.matchState = MatchState.FINISHED;
            this.winnerTeam = Array.from(activeTeams)[0];
        }
        else if (activeTeams.size === 0 && this.matchState === MatchState.IN_GAME) {
            // Mutual destruction — team 0 (player) loses
            this.matchState = MatchState.FINISHED;
            this.winnerTeam = 1;
        }
    }
    isEnemy(source, target) {
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
    calculateChecksum() {
        let hash = this.tickIndex ^ this.seed;
        const mix = (v) => {
            hash = ((hash << 5) - hash) + (v | 0);
            hash |= 0;
        };
        mix(this.prng.getSeedState());
        mix(this.matchState === MatchState.FINISHED ? 0x5150 + this.winnerTeam : 0);
        for (const e of this.entities.values()) {
            mix(e.id);
            mix(e.x);
            mix(e.y);
            mix(e.hp);
            mix(e.currentOre);
            mix(e.shield);
            mix(e.attackCooldown);
            mix(e.veterancy);
            mix(e.expEarned);
            mix(e.isPowered ? 1 : 0);
            mix(e.disabledTicksRemaining);
            mix(e.targetEntityId ?? -1);
            mix(e.targetX ?? -1);
            mix(e.targetY ?? -1);
            // Standing orders are simulation state: two clients disagreeing about a
            // patrol leg or guard post would diverge, so the hash must cover them.
            mix(e.orderMode === OrderMode.HOLD ? 1 : e.orderMode === OrderMode.PATROL ? 2
                : e.orderMode === OrderMode.GUARD ? 3 : e.orderMode === OrderMode.ATTACK_MOVE ? 4 : 0);
            mix(e.stance === UnitStance.AGGRESSIVE ? 1 : e.stance === UnitStance.DEFENSIVE ? 2 : 3);
            mix(e.patrolIndex ?? -1);
            mix(e.postX ?? -1);
            mix(e.postY ?? -1);
            mix(e.guardEntityId ?? -1);
            if (e.patrolRoute)
                for (const leg of e.patrolRoute) {
                    mix(leg.x);
                    mix(leg.y);
                }
            for (const item of e.productionQueue) {
                mix(item.progressTicks);
                mix(item.costPaid);
                // Cheap deterministic string hash of the queued spec id
                let sh = 0;
                for (let i = 0; i < item.specId.length; i++)
                    sh = ((sh << 5) - sh + item.specId.charCodeAt(i)) | 0;
                mix(sh);
            }
        }
        for (const p of this.players) {
            mix(p.credits);
            mix(p.powerProduced);
            mix(p.powerConsumed);
            mix(p.commandCapUsed);
            mix(p.hasHQ ? 1 : 0);
        }
        for (const rn of this.resourceNodes.values()) {
            mix(rn.creditsRemaining);
        }
        return Math.abs(hash);
    }
    createSnapshot() {
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
//# sourceMappingURL=simulation.js.map