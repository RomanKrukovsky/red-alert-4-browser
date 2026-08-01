import { FactionId } from '@ra4/shared-types';
export interface IntelMemoryEntry {
    entityId: number;
    specId: string;
    isBuilding: boolean;
    x: number;
    y: number;
    lastSeenTick: number;
    certainty: number;
    healthPercentage: number;
    playerIndex: number;
}
export interface AIOperationGoal {
    id: string;
    type: 'SCOUT' | 'DEFEND_BASE' | 'DEFEND_ECONOMY' | 'ATTACK_MAIN' | 'RAID_HARVESTERS' | 'RECOVER';
    priority: number;
    targetX: number;
    targetY: number;
    assignedEntityIds: number[];
    createdAtTick: number;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
export interface AIBlackboard {
    playerIndex: number;
    factionId: FactionId;
    difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR';
    personality: 'AGGRESSIVE' | 'DEFENSIVE' | 'ECONOMIC' | 'ADAPTIVE' | 'RAIDER';
    currentPhase: 'OPENING' | 'EXPANSION' | 'MIDGAME' | 'PRESSURE' | 'DEFENSE' | 'RECOVERY' | 'ENDGAME';
    credits: number;
    incomePerMin: number;
    powerProduced: number;
    powerConsumed: number;
    isPowerLow: boolean;
    harvesterCount: number;
    targetHarvesterCount: number;
    intelEntries: Map<number, IntelMemoryEntry>;
    threatGrid: number[][];
    hqPosition: {
        x: number;
        y: number;
    } | null;
    baseRadius: number;
    claimedOreNodes: {
        x: number;
        y: number;
    }[];
    activeGoals: AIOperationGoal[];
    assignedUnits: Map<number, string>;
}
export declare function createInitialBlackboard(playerIndex: number, factionId: FactionId, difficulty?: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR', personality?: 'AGGRESSIVE' | 'DEFENSIVE' | 'ECONOMIC' | 'ADAPTIVE' | 'RAIDER'): AIBlackboard;
//# sourceMappingURL=aiBlackboard.d.ts.map