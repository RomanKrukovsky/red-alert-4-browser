import { ArmorType, BuildingCategory, FactionId, MatchState, PlayerCommand, PlayerEconomyState, PlayerType, UnitCategory, VeterancyRank, WorldSnapshot } from '@ra4/shared-types';
import { Mulberry32PRNG } from './prng.js';
import { SpatialHashGrid } from './spatialGrid.js';
import { FogOfWarManager } from './fogOfWar.js';
import { NavigationService } from './navigation.js';
import { SkirmishAIAgent } from './aiAgent.js';
export interface SimEntity {
    id: number;
    specId: string;
    factionId: FactionId;
    playerIndex: number;
    category: UnitCategory | BuildingCategory;
    x: number;
    y: number;
    targetX?: number;
    targetY?: number;
    waypoints?: {
        x: number;
        y: number;
    }[];
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
    moveSpeed: number;
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
export declare class GameSimulation {
    tickIndex: number;
    seed: number;
    prng: Mulberry32PRNG;
    spatialGrid: SpatialHashGrid<SimEntity>;
    fogOfWar: FogOfWarManager;
    navigation: NavigationService;
    superweaponManager: SuperweaponManager;
    entities: Map<number, SimEntity>;
    players: PlayerEconomyState[];
    resourceNodes: Map<string, ResourceNodeState>;
    aiAgents: Map<number, SkirmishAIAgent>;
    playerTeams: number[];
    playerFactions: FactionId[];
    surrenderedPlayers: Set<number>;
    private pendingShotFX;
    nextEntityId: number;
    matchState: MatchState;
    winnerTeam: number;
    /** Map dimensions in grid tiles (1 tile = 1000 scaled units). */
    mapWidth: number;
    mapHeight: number;
    constructor(seed?: number, mapWidth?: number, mapHeight?: number);
    initMatch(playerConfigs: {
        name: string;
        factionId: FactionId;
        type: PlayerType;
        team: number;
    }[], startingCredits?: number): void;
    spawnBuilding(specId: string, playerIndex: number, x: number, y: number): number;
    spawnUnit(specId: string, playerIndex: number, x: number, y: number): number;
    processCommands(commands: PlayerCommand[]): void;
    private executeCommand;
    private isBuildLocationValid;
    step(): WorldSnapshot;
    /** Remove an entity, unregistering building obstacles from the nav grid. */
    removeEntity(id: number): void;
    recalculateEconomy(): void;
    private cachedTeamList;
    private updateFogOfWar;
    checkVictory(): void;
    private isEnemy;
    calculateChecksum(): number;
    createSnapshot(): WorldSnapshot;
}
//# sourceMappingURL=simulation.d.ts.map