import { z } from 'zod';
import { ArmorType, BuildingCategory, DamageType, FactionId, PassabilityType, TechTier, UnitCategory } from '@ra4/shared-types';
export declare const WeaponSpecSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    damageType: z.ZodNativeEnum<typeof DamageType>;
    baseDamage: z.ZodNumber;
    range: z.ZodNumber;
    cooldownTicks: z.ZodNumber;
    splashRadius: z.ZodDefault<z.ZodNumber>;
    minRange: z.ZodOptional<z.ZodNumber>;
    projectileSpeed: z.ZodOptional<z.ZodNumber>;
    targetsAir: z.ZodDefault<z.ZodBoolean>;
    targetsGround: z.ZodDefault<z.ZodBoolean>;
    targetsNaval: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    damageType: DamageType;
    baseDamage: number;
    range: number;
    cooldownTicks: number;
    splashRadius: number;
    targetsAir: boolean;
    targetsGround: boolean;
    targetsNaval: boolean;
    minRange?: number | undefined;
    projectileSpeed?: number | undefined;
}, {
    id: string;
    name: string;
    damageType: DamageType;
    baseDamage: number;
    range: number;
    cooldownTicks: number;
    splashRadius?: number | undefined;
    minRange?: number | undefined;
    projectileSpeed?: number | undefined;
    targetsAir?: boolean | undefined;
    targetsGround?: boolean | undefined;
    targetsNaval?: boolean | undefined;
}>;
export declare const UnitSpecSchema: z.ZodObject<{
    id: z.ZodString;
    legacyAlias: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    factionId: z.ZodNativeEnum<typeof FactionId>;
    category: z.ZodNativeEnum<typeof UnitCategory>;
    tier: z.ZodNativeEnum<typeof TechTier>;
    cost: z.ZodNumber;
    buildTimeSeconds: z.ZodNumber;
    commandCapCost: z.ZodNumber;
    hp: z.ZodNumber;
    shield: z.ZodDefault<z.ZodNumber>;
    armorType: z.ZodNativeEnum<typeof ArmorType>;
    speed: z.ZodNumber;
    sightRange: z.ZodNumber;
    weaponId: z.ZodOptional<z.ZodString>;
    secondaryWeaponId: z.ZodOptional<z.ZodString>;
    abilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    passability: z.ZodDefault<z.ZodNativeEnum<typeof PassabilityType>>;
    harvesterCapacity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
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
    legacyAlias?: string | undefined;
    weaponId?: string | undefined;
    secondaryWeaponId?: string | undefined;
    harvesterCapacity?: number | undefined;
}, {
    id: string;
    name: string;
    factionId: FactionId;
    category: UnitCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    commandCapCost: number;
    hp: number;
    armorType: ArmorType;
    speed: number;
    sightRange: number;
    legacyAlias?: string | undefined;
    shield?: number | undefined;
    weaponId?: string | undefined;
    secondaryWeaponId?: string | undefined;
    abilities?: string[] | undefined;
    prerequisites?: string[] | undefined;
    passability?: PassabilityType | undefined;
    harvesterCapacity?: number | undefined;
}>;
export declare const BuildingSpecSchema: z.ZodObject<{
    id: z.ZodString;
    legacyAlias: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    factionId: z.ZodNativeEnum<typeof FactionId>;
    category: z.ZodNativeEnum<typeof BuildingCategory>;
    tier: z.ZodNativeEnum<typeof TechTier>;
    cost: z.ZodNumber;
    buildTimeSeconds: z.ZodNumber;
    commandCapGranted: z.ZodDefault<z.ZodNumber>;
    powerProduced: z.ZodDefault<z.ZodNumber>;
    powerConsumed: z.ZodDefault<z.ZodNumber>;
    hp: z.ZodNumber;
    shield: z.ZodDefault<z.ZodNumber>;
    armorType: z.ZodNativeEnum<typeof ArmorType>;
    sightRange: z.ZodNumber;
    weaponId: z.ZodOptional<z.ZodString>;
    garrisonCapacity: z.ZodDefault<z.ZodNumber>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    gridWidth: z.ZodDefault<z.ZodNumber>;
    gridHeight: z.ZodDefault<z.ZodNumber>;
    producesCategory: z.ZodOptional<z.ZodNativeEnum<typeof UnitCategory>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    factionId: FactionId;
    category: BuildingCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    hp: number;
    shield: number;
    armorType: ArmorType;
    sightRange: number;
    prerequisites: string[];
    commandCapGranted: number;
    powerProduced: number;
    powerConsumed: number;
    garrisonCapacity: number;
    gridWidth: number;
    gridHeight: number;
    legacyAlias?: string | undefined;
    weaponId?: string | undefined;
    producesCategory?: UnitCategory | undefined;
}, {
    id: string;
    name: string;
    factionId: FactionId;
    category: BuildingCategory;
    tier: TechTier;
    cost: number;
    buildTimeSeconds: number;
    hp: number;
    armorType: ArmorType;
    sightRange: number;
    legacyAlias?: string | undefined;
    shield?: number | undefined;
    weaponId?: string | undefined;
    prerequisites?: string[] | undefined;
    commandCapGranted?: number | undefined;
    powerProduced?: number | undefined;
    powerConsumed?: number | undefined;
    garrisonCapacity?: number | undefined;
    gridWidth?: number | undefined;
    gridHeight?: number | undefined;
    producesCategory?: UnitCategory | undefined;
}>;
export declare const FactionSpecSchema: z.ZodObject<{
    id: z.ZodNativeEnum<typeof FactionId>;
    name: z.ZodString;
    description: z.ZodString;
    resourceName: z.ZodString;
    resourceDescription: z.ZodString;
    hqBuildingId: z.ZodString;
    powerBuildingId: z.ZodString;
    refineryBuildingId: z.ZodString;
    barracksBuildingId: z.ZodString;
    factoryBuildingId: z.ZodString;
    techBuildingId: z.ZodString;
    defenseBuildingId: z.ZodString;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const ResourceNodeMapEntrySchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    isRich: z.ZodBoolean;
    creditsRemaining: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    x: number;
    y: number;
    isRich: boolean;
    creditsRemaining: number;
}, {
    id: string;
    x: number;
    y: number;
    isRich: boolean;
    creditsRemaining: number;
}>;
export declare const NeutralStructureMapEntrySchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["OIL_DERRICK", "REPAIR_DEPOT", "OBSERVATION_POST"]>;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
    x: number;
    y: number;
}, {
    id: string;
    type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
    x: number;
    y: number;
}>;
export declare const SpawnPointMapEntrySchema: z.ZodObject<{
    index: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    index: number;
}, {
    x: number;
    y: number;
    index: number;
}>;
export declare const MapDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    spawnPoints: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        index: number;
    }, {
        x: number;
        y: number;
        index: number;
    }>, "many">;
    resourceNodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        isRich: z.ZodBoolean;
        creditsRemaining: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        x: number;
        y: number;
        isRich: boolean;
        creditsRemaining: number;
    }, {
        id: string;
        x: number;
        y: number;
        isRich: boolean;
        creditsRemaining: number;
    }>, "many">;
    neutralStructures: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["OIL_DERRICK", "REPAIR_DEPOT", "OBSERVATION_POST"]>;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
        x: number;
        y: number;
    }, {
        id: string;
        type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
        x: number;
        y: number;
    }>, "many">;
    heightMap: z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">;
    passabilityGrid: z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    width: number;
    height: number;
    maxPlayers: number;
    spawnPoints: {
        x: number;
        y: number;
        index: number;
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
        type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
        x: number;
        y: number;
    }[];
    heightMap: number[][];
    passabilityGrid: number[][];
}, {
    id: string;
    name: string;
    width: number;
    height: number;
    maxPlayers: number;
    spawnPoints: {
        x: number;
        y: number;
        index: number;
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
        type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
        x: number;
        y: number;
    }[];
    heightMap: number[][];
    passabilityGrid: number[][];
}>;
export declare const ContentDatabaseSchema: z.ZodObject<{
    factions: z.ZodArray<z.ZodObject<{
        id: z.ZodNativeEnum<typeof FactionId>;
        name: z.ZodString;
        description: z.ZodString;
        resourceName: z.ZodString;
        resourceDescription: z.ZodString;
        hqBuildingId: z.ZodString;
        powerBuildingId: z.ZodString;
        refineryBuildingId: z.ZodString;
        barracksBuildingId: z.ZodString;
        factoryBuildingId: z.ZodString;
        techBuildingId: z.ZodString;
        defenseBuildingId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>, "many">;
    buildings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        legacyAlias: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        factionId: z.ZodNativeEnum<typeof FactionId>;
        category: z.ZodNativeEnum<typeof BuildingCategory>;
        tier: z.ZodNativeEnum<typeof TechTier>;
        cost: z.ZodNumber;
        buildTimeSeconds: z.ZodNumber;
        commandCapGranted: z.ZodDefault<z.ZodNumber>;
        powerProduced: z.ZodDefault<z.ZodNumber>;
        powerConsumed: z.ZodDefault<z.ZodNumber>;
        hp: z.ZodNumber;
        shield: z.ZodDefault<z.ZodNumber>;
        armorType: z.ZodNativeEnum<typeof ArmorType>;
        sightRange: z.ZodNumber;
        weaponId: z.ZodOptional<z.ZodString>;
        garrisonCapacity: z.ZodDefault<z.ZodNumber>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        gridWidth: z.ZodDefault<z.ZodNumber>;
        gridHeight: z.ZodDefault<z.ZodNumber>;
        producesCategory: z.ZodOptional<z.ZodNativeEnum<typeof UnitCategory>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        factionId: FactionId;
        category: BuildingCategory;
        tier: TechTier;
        cost: number;
        buildTimeSeconds: number;
        hp: number;
        shield: number;
        armorType: ArmorType;
        sightRange: number;
        prerequisites: string[];
        commandCapGranted: number;
        powerProduced: number;
        powerConsumed: number;
        garrisonCapacity: number;
        gridWidth: number;
        gridHeight: number;
        legacyAlias?: string | undefined;
        weaponId?: string | undefined;
        producesCategory?: UnitCategory | undefined;
    }, {
        id: string;
        name: string;
        factionId: FactionId;
        category: BuildingCategory;
        tier: TechTier;
        cost: number;
        buildTimeSeconds: number;
        hp: number;
        armorType: ArmorType;
        sightRange: number;
        legacyAlias?: string | undefined;
        shield?: number | undefined;
        weaponId?: string | undefined;
        prerequisites?: string[] | undefined;
        commandCapGranted?: number | undefined;
        powerProduced?: number | undefined;
        powerConsumed?: number | undefined;
        garrisonCapacity?: number | undefined;
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
        producesCategory?: UnitCategory | undefined;
    }>, "many">;
    units: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        legacyAlias: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        factionId: z.ZodNativeEnum<typeof FactionId>;
        category: z.ZodNativeEnum<typeof UnitCategory>;
        tier: z.ZodNativeEnum<typeof TechTier>;
        cost: z.ZodNumber;
        buildTimeSeconds: z.ZodNumber;
        commandCapCost: z.ZodNumber;
        hp: z.ZodNumber;
        shield: z.ZodDefault<z.ZodNumber>;
        armorType: z.ZodNativeEnum<typeof ArmorType>;
        speed: z.ZodNumber;
        sightRange: z.ZodNumber;
        weaponId: z.ZodOptional<z.ZodString>;
        secondaryWeaponId: z.ZodOptional<z.ZodString>;
        abilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        passability: z.ZodDefault<z.ZodNativeEnum<typeof PassabilityType>>;
        harvesterCapacity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
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
        legacyAlias?: string | undefined;
        weaponId?: string | undefined;
        secondaryWeaponId?: string | undefined;
        harvesterCapacity?: number | undefined;
    }, {
        id: string;
        name: string;
        factionId: FactionId;
        category: UnitCategory;
        tier: TechTier;
        cost: number;
        buildTimeSeconds: number;
        commandCapCost: number;
        hp: number;
        armorType: ArmorType;
        speed: number;
        sightRange: number;
        legacyAlias?: string | undefined;
        shield?: number | undefined;
        weaponId?: string | undefined;
        secondaryWeaponId?: string | undefined;
        abilities?: string[] | undefined;
        prerequisites?: string[] | undefined;
        passability?: PassabilityType | undefined;
        harvesterCapacity?: number | undefined;
    }>, "many">;
    weapons: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        damageType: z.ZodNativeEnum<typeof DamageType>;
        baseDamage: z.ZodNumber;
        range: z.ZodNumber;
        cooldownTicks: z.ZodNumber;
        splashRadius: z.ZodDefault<z.ZodNumber>;
        minRange: z.ZodOptional<z.ZodNumber>;
        projectileSpeed: z.ZodOptional<z.ZodNumber>;
        targetsAir: z.ZodDefault<z.ZodBoolean>;
        targetsGround: z.ZodDefault<z.ZodBoolean>;
        targetsNaval: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        damageType: DamageType;
        baseDamage: number;
        range: number;
        cooldownTicks: number;
        splashRadius: number;
        targetsAir: boolean;
        targetsGround: boolean;
        targetsNaval: boolean;
        minRange?: number | undefined;
        projectileSpeed?: number | undefined;
    }, {
        id: string;
        name: string;
        damageType: DamageType;
        baseDamage: number;
        range: number;
        cooldownTicks: number;
        splashRadius?: number | undefined;
        minRange?: number | undefined;
        projectileSpeed?: number | undefined;
        targetsAir?: boolean | undefined;
        targetsGround?: boolean | undefined;
        targetsNaval?: boolean | undefined;
    }>, "many">;
    maps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
        maxPlayers: z.ZodNumber;
        spawnPoints: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            index: number;
        }, {
            x: number;
            y: number;
            index: number;
        }>, "many">;
        resourceNodes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            isRich: z.ZodBoolean;
            creditsRemaining: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            x: number;
            y: number;
            isRich: boolean;
            creditsRemaining: number;
        }, {
            id: string;
            x: number;
            y: number;
            isRich: boolean;
            creditsRemaining: number;
        }>, "many">;
        neutralStructures: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["OIL_DERRICK", "REPAIR_DEPOT", "OBSERVATION_POST"]>;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
            x: number;
            y: number;
        }, {
            id: string;
            type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
            x: number;
            y: number;
        }>, "many">;
        heightMap: z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">;
        passabilityGrid: z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        width: number;
        height: number;
        maxPlayers: number;
        spawnPoints: {
            x: number;
            y: number;
            index: number;
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
            type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
            x: number;
            y: number;
        }[];
        heightMap: number[][];
        passabilityGrid: number[][];
    }, {
        id: string;
        name: string;
        width: number;
        height: number;
        maxPlayers: number;
        spawnPoints: {
            x: number;
            y: number;
            index: number;
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
            type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
            x: number;
            y: number;
        }[];
        heightMap: number[][];
        passabilityGrid: number[][];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    factions: {
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
    buildings: {
        id: string;
        name: string;
        factionId: FactionId;
        category: BuildingCategory;
        tier: TechTier;
        cost: number;
        buildTimeSeconds: number;
        hp: number;
        shield: number;
        armorType: ArmorType;
        sightRange: number;
        prerequisites: string[];
        commandCapGranted: number;
        powerProduced: number;
        powerConsumed: number;
        garrisonCapacity: number;
        gridWidth: number;
        gridHeight: number;
        legacyAlias?: string | undefined;
        weaponId?: string | undefined;
        producesCategory?: UnitCategory | undefined;
    }[];
    units: {
        id: string;
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
        legacyAlias?: string | undefined;
        weaponId?: string | undefined;
        secondaryWeaponId?: string | undefined;
        harvesterCapacity?: number | undefined;
    }[];
    weapons: {
        id: string;
        name: string;
        damageType: DamageType;
        baseDamage: number;
        range: number;
        cooldownTicks: number;
        splashRadius: number;
        targetsAir: boolean;
        targetsGround: boolean;
        targetsNaval: boolean;
        minRange?: number | undefined;
        projectileSpeed?: number | undefined;
    }[];
    maps: {
        id: string;
        name: string;
        width: number;
        height: number;
        maxPlayers: number;
        spawnPoints: {
            x: number;
            y: number;
            index: number;
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
            type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
            x: number;
            y: number;
        }[];
        heightMap: number[][];
        passabilityGrid: number[][];
    }[];
}, {
    factions: {
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
    buildings: {
        id: string;
        name: string;
        factionId: FactionId;
        category: BuildingCategory;
        tier: TechTier;
        cost: number;
        buildTimeSeconds: number;
        hp: number;
        armorType: ArmorType;
        sightRange: number;
        legacyAlias?: string | undefined;
        shield?: number | undefined;
        weaponId?: string | undefined;
        prerequisites?: string[] | undefined;
        commandCapGranted?: number | undefined;
        powerProduced?: number | undefined;
        powerConsumed?: number | undefined;
        garrisonCapacity?: number | undefined;
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
        producesCategory?: UnitCategory | undefined;
    }[];
    units: {
        id: string;
        name: string;
        factionId: FactionId;
        category: UnitCategory;
        tier: TechTier;
        cost: number;
        buildTimeSeconds: number;
        commandCapCost: number;
        hp: number;
        armorType: ArmorType;
        speed: number;
        sightRange: number;
        legacyAlias?: string | undefined;
        shield?: number | undefined;
        weaponId?: string | undefined;
        secondaryWeaponId?: string | undefined;
        abilities?: string[] | undefined;
        prerequisites?: string[] | undefined;
        passability?: PassabilityType | undefined;
        harvesterCapacity?: number | undefined;
    }[];
    weapons: {
        id: string;
        name: string;
        damageType: DamageType;
        baseDamage: number;
        range: number;
        cooldownTicks: number;
        splashRadius?: number | undefined;
        minRange?: number | undefined;
        projectileSpeed?: number | undefined;
        targetsAir?: boolean | undefined;
        targetsGround?: boolean | undefined;
        targetsNaval?: boolean | undefined;
    }[];
    maps: {
        id: string;
        name: string;
        width: number;
        height: number;
        maxPlayers: number;
        spawnPoints: {
            x: number;
            y: number;
            index: number;
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
            type: "OIL_DERRICK" | "REPAIR_DEPOT" | "OBSERVATION_POST";
            x: number;
            y: number;
        }[];
        heightMap: number[][];
        passabilityGrid: number[][];
    }[];
}>;
export type ContentDatabase = z.infer<typeof ContentDatabaseSchema>;
//# sourceMappingURL=index.d.ts.map