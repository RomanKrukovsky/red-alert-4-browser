import { EntityStateSnapshot, UnitCategory, WorldSnapshot } from '@ra4/shared-types';
import { OFFICIAL_BUILDINGS } from '@ra4/content-runtime';

export interface HUDSelectionViewModel {
  id: number;
  specId: string;
  isBuilding: boolean;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  veterancy: number;
  isDisabled: boolean;
  hasMoveTarget: boolean;
  hasAttackTarget: boolean;
  currentOre: number;
  maxOre: number;
}

export interface HUDQueueItemViewModel {
  id: string;
  specId: string;
  progressTicks: number;
  totalTicks: number;
  producerEntityId: number;
}

export interface MinimapPoint {
  x: number;
  y: number;
  isBuilding: boolean;
  isFriendly: boolean;
}

export interface GameplayHUDViewModel {
  tick: number;
  matchTimeSeconds: number;
  credits: number;
  powerProduced: number;
  powerConsumed: number;
  powerLow: boolean;
  commandCapUsed: number;
  commandCapMax: number;
  factionResource: number;
  techTier: number;
  selected: HUDSelectionViewModel | null;
  selectedEntities: HUDSelectionViewModel[];
  producerEntityId: number | null;
  queue: HUDQueueItemViewModel[];
  elapsed: string;
  minimapPoints: MinimapPoint[];
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
  shield: entity.shield,
  maxShield: entity.maxShield,
  veterancy: entity.veterancy,
  isDisabled: entity.isDisabled,
  hasMoveTarget: Boolean(entity.moveTarget),
  hasAttackTarget: entity.targetEntityId !== undefined,
  currentOre: entity.currentOre,
  maxOre: entity.maxOre,
} : null;

const toSelectionNonNull = (entity: EntityStateSnapshot): HUDSelectionViewModel => ({
  id: entity.id,
  specId: entity.specId,
  isBuilding: entity.isBuilding,
  hp: entity.hp,
  maxHp: entity.maxHp,
  shield: entity.shield,
  maxShield: entity.maxShield,
  veterancy: entity.veterancy,
  isDisabled: entity.isDisabled,
  hasMoveTarget: Boolean(entity.moveTarget),
  hasAttackTarget: entity.targetEntityId !== undefined,
  currentOre: entity.currentOre,
  maxOre: entity.maxOre,
});

export const createGameplayHUDViewModel = (snapshot: WorldSnapshot | null, selectedEntityIds: number[], producerCategory?: UnitCategory): GameplayHUDViewModel => {
  const player = snapshot?.players[0] ?? fallbackPlayer;
  const ownedEntities = snapshot?.entities.filter((entity) => entity.playerIndex === 0) ?? [];
  const selectedEntity = snapshot?.entities.find((entity) => selectedEntityIds.includes(entity.id)) ?? ownedEntities.find((entity) => entity.isBuilding) ?? ownedEntities[0];
  const selectedProducer = selectedEntity?.isBuilding
    ? OFFICIAL_BUILDINGS.find((building) => building.id === selectedEntity.specId)?.producesCategory === producerCategory ? selectedEntity : undefined
    : undefined;
  const producer = selectedProducer ?? ownedEntities.find((entity) => {
    if (!producerCategory || !entity.isBuilding) return !producerCategory;
    return OFFICIAL_BUILDINGS.find((building) => building.id === entity.specId)?.producesCategory === producerCategory;
  });
  const queue = ownedEntities.flatMap((entity) => entity.productionQueue.map((item) => ({
    id: item.id,
    specId: item.specId,
    progressTicks: item.progressTicks,
    totalTicks: item.totalTicks,
    producerEntityId: entity.id,
  }))).slice(0, 4);
  const elapsedSeconds = Math.floor((snapshot?.tick ?? 0) / 30);

  // Build selectedEntities array for group display
  const selectedEntities: HUDSelectionViewModel[] = selectedEntityIds.length > 1
    ? (snapshot?.entities ?? []).filter((entity) => selectedEntityIds.includes(entity.id)).map(toSelectionNonNull)
    : [];

  // Build minimap points from all visible entities
  const MAP_MAX = 64_000;
  const minimapPoints: MinimapPoint[] = (snapshot?.entities ?? []).map((entity) => ({
    x: entity.position.x / MAP_MAX,
    y: entity.position.y / MAP_MAX,
    isBuilding: entity.isBuilding,
    isFriendly: entity.playerIndex === 0,
  }));

  return {
    tick: snapshot?.tick ?? 0,
    matchTimeSeconds: elapsedSeconds,
    credits: player.credits,
    powerProduced: player.powerProduced,
    powerConsumed: player.powerConsumed,
    powerLow: player.powerLow,
    commandCapUsed: player.commandCapUsed,
    commandCapMax: player.commandCapMax,
    factionResource: player.factionResource,
    techTier: player.techTier,
    selected: toSelection(selectedEntity),
    selectedEntities,
    producerEntityId: producer?.id ?? null,
    queue,
    elapsed: `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`,
    minimapPoints,
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
