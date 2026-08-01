import { EntityStateSnapshot, WorldSnapshot } from '@ra4/shared-types';

export interface HUDSelectionViewModel {
  id: number;
  specId: string;
  isBuilding: boolean;
  hp: number;
  maxHp: number;
  isDisabled: boolean;
  hasMoveTarget: boolean;
}

export interface HUDQueueItemViewModel {
  id: string;
  specId: string;
  progressTicks: number;
  totalTicks: number;
  producerEntityId: number;
}

export interface GameplayHUDViewModel {
  tick: number;
  credits: number;
  powerProduced: number;
  powerConsumed: number;
  powerLow: boolean;
  commandCapUsed: number;
  commandCapMax: number;
  factionResource: number;
  techTier: number;
  selected: HUDSelectionViewModel | null;
  producerEntityId: number | null;
  queue: HUDQueueItemViewModel[];
  elapsed: string;
}

const fallbackPlayer = {
  credits: 23450,
  powerProduced: 200,
  powerConsumed: 88,
  powerLow: false,
  commandCapUsed: 88,
  commandCapMax: 200,
  factionResource: 68,
  techTier: 1,
};

const toSelection = (entity: EntityStateSnapshot | undefined): HUDSelectionViewModel | null => entity ? {
  id: entity.id,
  specId: entity.specId,
  isBuilding: entity.isBuilding,
  hp: entity.hp,
  maxHp: entity.maxHp,
  isDisabled: entity.isDisabled,
  hasMoveTarget: Boolean(entity.moveTarget),
} : null;

export const createGameplayHUDViewModel = (snapshot: WorldSnapshot | null, selectedEntityIds: number[]): GameplayHUDViewModel => {
  const player = snapshot?.players[0] ?? fallbackPlayer;
  const ownedEntities = snapshot?.entities.filter((entity) => entity.playerIndex === 0) ?? [];
  const selectedEntity = snapshot?.entities.find((entity) => selectedEntityIds.includes(entity.id)) ?? ownedEntities.find((entity) => entity.isBuilding) ?? ownedEntities[0];
  const producer = ownedEntities.find((entity) => entity.isBuilding);
  const queue = ownedEntities.flatMap((entity) => entity.productionQueue.map((item) => ({
    id: item.id,
    specId: item.specId,
    progressTicks: item.progressTicks,
    totalTicks: item.totalTicks,
    producerEntityId: entity.id,
  }))).slice(0, 4);
  const elapsedSeconds = Math.floor((snapshot?.tick ?? 0) / 30);

  return {
    tick: snapshot?.tick ?? 0,
    credits: player.credits,
    powerProduced: player.powerProduced,
    powerConsumed: player.powerConsumed,
    powerLow: player.powerLow,
    commandCapUsed: player.commandCapUsed,
    commandCapMax: player.commandCapMax,
    factionResource: player.factionResource,
    techTier: player.techTier,
    selected: toSelection(selectedEntity),
    producerEntityId: producer?.id ?? null,
    queue,
    elapsed: `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`,
  };
};

export const formatResource = (value: number): string => value.toLocaleString('ru-RU');

export const queueProgress = (progressTicks: number, totalTicks: number): number => totalTicks <= 0 ? 0 : Math.max(0, Math.min(1, progressTicks / totalTicks));

export type ProductionAvailability = 'locked' | 'insufficient-funds' | 'available' | 'ready';

export const productionAvailability = (credits: number, cost: number, locked: boolean, ready: boolean): ProductionAvailability => {
  if (locked) return 'locked';
  if (credits < cost) return 'insufficient-funds';
  return ready ? 'ready' : 'available';
};
