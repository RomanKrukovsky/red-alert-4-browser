export const SUPPORTED_GAMEPLAY_ASSET_IDS = [
  'SU_GranitMBT',
  'SU_BogatyrOreCarrier',
  'SU_RubezhRifleman',
  'SU_HeavyFactory',
  'SU_Pillbox',
] as const;

export type SupportedGameplayAssetId = typeof SUPPORTED_GAMEPLAY_ASSET_IDS[number];

export interface GameplayAssetProfile {
  id: SupportedGameplayAssetId;
  scale: number;
  rotationOffset: number;
  groundOffset: number;
  selectionDiameter: number;
  animations: {
    idle: readonly string[];
    move: readonly string[];
    fire: readonly string[];
  };
  muzzle?: string;
  turretYaw?: string;
  oreFillAnchor?: string;
  unloadSocket?: string;
  exitPoint?: string;
  fallbackMuzzleOffset: readonly [number, number, number];
}

export interface PresentationEntityPosition {
  id: number;
  specId: string;
  position: { x: number; y: number };
}

export interface PresentationShot {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

const EMPTY_ANIMATIONS = { idle: [] as const, move: [] as const, fire: [] as const };

const profiles: Record<SupportedGameplayAssetId, GameplayAssetProfile> = {
  SU_GranitMBT: { id: 'SU_GranitMBT', scale: .3, rotationOffset: 0, groundOffset: 0, selectionDiameter: 4.5, animations: { idle: [], move: ['Forward'], fire: [] }, muzzle: 'Muzzle', turretYaw: 'TurretYaw', fallbackMuzzleOffset: [2.2, 1.25, 0] },
  SU_BogatyrOreCarrier: { id: 'SU_BogatyrOreCarrier', scale: .28, rotationOffset: 0, groundOffset: 0, selectionDiameter: 4.8, animations: { idle: [], move: ['Forward'], fire: [] }, oreFillAnchor: 'OreFillAnchor', unloadSocket: 'UnloadSocket', fallbackMuzzleOffset: [0, 1, 0] },
  SU_RubezhRifleman: { id: 'SU_RubezhRifleman', scale: .85, rotationOffset: -Math.PI / 2, groundOffset: 0, selectionDiameter: 1.35, animations: { idle: ['Idle_Gun', 'Idle'], move: ['Run', 'Walk'], fire: ['Idle_Gun_Shoot', 'Gun_Shoot'] }, muzzle: 'Muzzle', fallbackMuzzleOffset: [.45, 1.35, 0] },
  SU_HeavyFactory: { id: 'SU_HeavyFactory', scale: .72, rotationOffset: 0, groundOffset: 0, selectionDiameter: 10.5, animations: EMPTY_ANIMATIONS, exitPoint: 'ExitPoint', fallbackMuzzleOffset: [0, 1, 0] },
  SU_Pillbox: { id: 'SU_Pillbox', scale: 1, rotationOffset: 0, groundOffset: 0, selectionDiameter: 3.7, animations: EMPTY_ANIMATIONS, muzzle: 'Muzzle', turretYaw: 'TurretYaw', fallbackMuzzleOffset: [0, 1.35, 1.1] },
};

export function getGameplayAssetProfile(specId: string): GameplayAssetProfile | undefined {
  return profiles[specId as SupportedGameplayAssetId];
}

export function resolveAnimation(profile: GameplayAssetProfile, moving: boolean, firing: boolean, available: ReadonlySet<string>): string | undefined {
  const candidates = firing ? profile.animations.fire : moving ? profile.animations.move : profile.animations.idle;
  return candidates.find((name) => available.has(name));
}

export function findNearestShooter<T extends PresentationEntityPosition>(entities: readonly T[], shot: PresentationShot, maximumDistance: number): T | undefined {
  const maximumDistanceSquared = (maximumDistance * 1000) ** 2;
  let nearest: T | undefined;
  let nearestDistanceSquared = maximumDistanceSquared;
  for (const entity of entities) {
    const profile = getGameplayAssetProfile(entity.specId);
    if (!profile?.muzzle) continue;
    const dx = entity.position.x - shot.startX;
    const dy = entity.position.y - shot.startY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared <= nearestDistanceSquared) {
      nearest = entity;
      nearestDistanceSquared = distanceSquared;
    }
  }
  return nearest;
}

export function normalizeCargo(currentOre: number, maximumOre: number): number {
  if (maximumOre <= 0) return 0;
  return Math.max(0, Math.min(1, currentOre / maximumOre));
}
