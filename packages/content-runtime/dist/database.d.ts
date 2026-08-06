import { ArmorType, BuildingCategory, DamageType, FactionId, PassabilityType, TechTier, UnitCategory } from '@ra4/shared-types';
import { ContentDatabase } from '@ra4/content-schema';
export declare const OFFICIAL_WEAPONS: {
    id: string;
    name: string;
    damageType: DamageType;
    baseDamage: number;
    range: number;
    cooldownTicks: number;
    splashRadius: number;
    targetsGround: boolean;
    targetsAir: boolean;
    targetsNaval: boolean;
}[];
export declare const OFFICIAL_UNITS: ({
    id: string;
    legacyAlias: string;
    name: string;
    factionId: FactionId;
    category: UnitCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapCost: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    speed: number;
    sightRange: number;
    weaponId: string;
    abilities: string[];
    prerequisites: string[];
    passability: PassabilityType;
    harvesterCapacity?: undefined;
} | {
    id: string;
    legacyAlias: string;
    name: string;
    factionId: FactionId;
    category: UnitCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapCost: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    speed: number;
    sightRange: number;
    abilities: string[];
    prerequisites: string[];
    passability: PassabilityType;
    weaponId?: undefined;
    harvesterCapacity?: undefined;
} | {
    id: string;
    legacyAlias: string;
    name: string;
    factionId: FactionId;
    category: UnitCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapCost: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    speed: number;
    sightRange: number;
    harvesterCapacity: number;
    abilities: string[];
    prerequisites: string[];
    passability: PassabilityType;
    weaponId?: undefined;
})[];
export declare const OFFICIAL_BUILDINGS: ({
    id: string;
    name: string;
    factionId: FactionId;
    category: BuildingCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapGranted: number;
    powerProduced: number;
    powerConsumed: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    sightRange: number;
    garrisonCapacity: number;
    prerequisites: string[];
    gridWidth: number;
    gridHeight: number;
    producesCategory: UnitCategory;
    weaponId?: undefined;
} | {
    id: string;
    name: string;
    factionId: FactionId;
    category: BuildingCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapGranted: number;
    powerProduced: number;
    powerConsumed: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    sightRange: number;
    garrisonCapacity: number;
    prerequisites: string[];
    gridWidth: number;
    gridHeight: number;
    producesCategory?: undefined;
    weaponId?: undefined;
} | {
    id: string;
    name: string;
    factionId: FactionId;
    category: BuildingCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapGranted: number;
    powerProduced: number;
    powerConsumed: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    sightRange: number;
    weaponId: string;
    garrisonCapacity: number;
    prerequisites: string[];
    gridWidth: number;
    gridHeight: number;
    producesCategory?: undefined;
})[];
export declare const OFFICIAL_FACTIONS: {
    id: FactionId;
    name: string;
    description: string;
    resourceName: string;
    resourceDescription: string;
    hqBuildingId: string;
    powerBuildingId: string;
    refineryBuildingId: string;
    barracksBuildingId: string;
    factoryBuildingId: string;
    techBuildingId: string;
    defenseBuildingId: string;
}[];
export declare const OFFICIAL_MAP_DUEL: {
    id: string;
    name: string;
    width: number;
    height: number;
    maxPlayers: number;
    spawnPoints: {
        index: number;
        x: number;
        y: number;
    }[];
    resourceNodes: {
        id: string;
        x: number;
        y: number;
        isRich: boolean;
        creditsRemaining: number;
    }[];
    neutralStructures: {
        id: string;
        type: "OIL_DERRICK";
        x: number;
        y: number;
    }[];
    heightMap: any[][];
    passabilityGrid: any[][];
};
/**
 * Second official map — a compact 96×96 four-corner arena.
 *
 * Distinct from the duel map in shape and economy: spawns sit closer
 * together (faster contact), each corner has a single home field, and the
 * two rich fields are on the shared diagonal, so contesting them is the
 * central decision instead of a single rich centre.
 */
export declare const OFFICIAL_MAP_CROSSROADS: {
    id: string;
    name: string;
    width: number;
    height: number;
    maxPlayers: number;
    spawnPoints: {
        index: number;
        x: number;
        y: number;
    }[];
    resourceNodes: {
        id: string;
        x: number;
        y: number;
        isRich: boolean;
        creditsRemaining: number;
    }[];
    neutralStructures: {
        id: string;
        type: "OIL_DERRICK";
        x: number;
        y: number;
    }[];
    heightMap: any[][];
    passabilityGrid: any[][];
};
export declare const DEFAULT_DATABASE: ContentDatabase;
//# sourceMappingURL=database.d.ts.map