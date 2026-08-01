import { FactionId } from '@ra4/shared-types';

export interface IntelMemoryEntry {
  entityId: number;
  specId: string;
  isBuilding: boolean;
  x: number;
  y: number;
  lastSeenTick: number;
  certainty: number; // 1.0 (fresh) to 0.0 (lost/decayed)
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
  team: number;
  factionId: FactionId;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR';
  personality: 'AGGRESSIVE' | 'DEFENSIVE' | 'ECONOMIC' | 'ADAPTIVE' | 'RAIDER';
  currentPhase: 'OPENING' | 'EXPANSION' | 'MIDGAME' | 'PRESSURE' | 'DEFENSE' | 'RECOVERY' | 'ENDGAME';

  // Economy & Income
  credits: number;
  incomePerMin: number;
  powerProduced: number;
  powerConsumed: number;
  isPowerLow: boolean;
  harvesterCount: number;
  targetHarvesterCount: number;

  // Intel & FOW Memory
  intelEntries: Map<number, IntelMemoryEntry>;
  threatGrid: number[][]; // 32x32 spatial threat score grid

  // Base & Expansion
  hqPosition: { x: number; y: number } | null;
  baseRadius: number;
  claimedOreNodes: { x: number; y: number }[];

  // Active Goals & Assignments
  activeGoals: AIOperationGoal[];
  assignedUnits: Map<number, string>; // entityId -> operationGoalId
}

export function createInitialBlackboard(
  playerIndex: number,
  factionId: FactionId,
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR' = 'HARD_FAIR',
  personality: 'AGGRESSIVE' | 'DEFENSIVE' | 'ECONOMIC' | 'ADAPTIVE' | 'RAIDER' = 'ADAPTIVE',
  team: number = playerIndex
): AIBlackboard {
  return {
    playerIndex,
    team,
    factionId,
    difficulty,
    personality,
    currentPhase: 'OPENING',
    credits: 10000,
    incomePerMin: 0,
    powerProduced: 100,
    powerConsumed: 0,
    isPowerLow: false,
    harvesterCount: 1,
    targetHarvesterCount: 2,
    intelEntries: new Map(),
    threatGrid: Array.from({ length: 32 }, () => new Array(32).fill(0)),
    hqPosition: null,
    baseRadius: 15,
    claimedOreNodes: [],
    activeGoals: [],
    assignedUnits: new Map()
  };
}
