export const SUPPORTED_GAMEPLAY_ASSET_IDS = [
  'SU_GranitMBT',
  'SU_BogatyrOreCarrier',
  'SU_RubezhRifleman',
  'SU_HeavyFactory',
  'SU_Pillbox',
  'SU_RedHQ', 'SU_ThermalPower', 'SU_OreRefinery', 'SU_MobilizationBarracks', 'SU_CommandRadar', 'SU_KorshunGunship',
  'AL_CommandHQ', 'AL_FissionReactor', 'AL_RefiningComplex', 'AL_InfantryBarracks', 'AL_ArmorWorks', 'AL_IntelCenter', 'AL_SentryTurret', 'AL_PioneerHarvester', 'AL_BulwarkMBT', 'AL_SentinelRifleman', 'AL_VectorVTOL',
  'CO_DynastyHQ', 'CO_SolarNode', 'CO_NaniteRefinery', 'CO_VanguardBarracks', 'CO_MechaFactory', 'CO_SyncMatrix', 'CO_PulsePylon', 'CO_YuanCollector', 'CO_QinglongMBT', 'CO_QianweiRifleman', 'CO_LeiheGunship',
  'CH_TemporalHQ', 'CH_SingularityCore', 'CH_FluxRefinery', 'CH_AssemblyNode', 'CH_Chronoworks', 'CH_CausalityLab', 'CH_StasisEmitter', 'CH_ProbabilistHarvester', 'CH_TimelineTank', 'CH_ResonanceRifleman', 'CH_TrailGunship',
] as const;

export type SupportedGameplayAssetId = typeof SUPPORTED_GAMEPLAY_ASSET_IDS[number];

export interface GameplayAssetProfile {
  id: string;
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

const staticProfile = (id: string, scale: number, selectionDiameter: number): GameplayAssetProfile => ({
  id,
  scale,
  rotationOffset: 0,
  groundOffset: 0,
  selectionDiameter,
  animations: EMPTY_ANIMATIONS,
  fallbackMuzzleOffset: [0, 1, 0],
});

const buildingProfile = (id: string, selectionDiameter = 8): GameplayAssetProfile => ({
  ...staticProfile(id, .72, selectionDiameter),
  exitPoint: 'ExitPoint',
});

const infantryProfile = (id: string): GameplayAssetProfile => ({
  ...staticProfile(id, .85, 1.35),
  rotationOffset: -Math.PI / 2,
  animations: { idle: ['Idle_Gun', 'Idle'], move: ['Run', 'Walk'], fire: ['Idle_Gun_Shoot', 'Gun_Shoot'] },
  muzzle: 'Muzzle',
  fallbackMuzzleOffset: [.45, 1.35, 0],
});

const vehicleProfile = (id: string, scale = .3): GameplayAssetProfile => ({
  ...staticProfile(id, scale, 4.5),
  muzzle: 'Muzzle',
  turretYaw: 'TurretYaw',
  fallbackMuzzleOffset: [2.2, 1.25, 0],
});

const profiles: Record<string, GameplayAssetProfile> = {
  SU_GranitMBT: { id: 'SU_GranitMBT', scale: .3, rotationOffset: 0, groundOffset: 0, selectionDiameter: 4.5, animations: { idle: [], move: ['Forward'], fire: [] }, muzzle: 'Muzzle', turretYaw: 'TurretYaw', fallbackMuzzleOffset: [2.2, 1.25, 0] },
  SU_BogatyrOreCarrier: { id: 'SU_BogatyrOreCarrier', scale: .28, rotationOffset: 0, groundOffset: 0, selectionDiameter: 4.8, animations: { idle: [], move: ['Forward'], fire: [] }, oreFillAnchor: 'OreFillAnchor', unloadSocket: 'UnloadSocket', fallbackMuzzleOffset: [0, 1, 0] },
  SU_RubezhRifleman: { id: 'SU_RubezhRifleman', scale: .85, rotationOffset: -Math.PI / 2, groundOffset: 0, selectionDiameter: 1.35, animations: { idle: ['Idle_Gun', 'Idle'], move: ['Run', 'Walk'], fire: ['Idle_Gun_Shoot', 'Gun_Shoot'] }, muzzle: 'Muzzle', fallbackMuzzleOffset: [.45, 1.35, 0] },
  SU_HeavyFactory: { id: 'SU_HeavyFactory', scale: .72, rotationOffset: 0, groundOffset: 0, selectionDiameter: 10.5, animations: EMPTY_ANIMATIONS, exitPoint: 'ExitPoint', fallbackMuzzleOffset: [0, 1, 0] },
  SU_Pillbox: { id: 'SU_Pillbox', scale: 1, rotationOffset: 0, groundOffset: 0, selectionDiameter: 3.7, animations: EMPTY_ANIMATIONS, muzzle: 'Muzzle', turretYaw: 'TurretYaw', fallbackMuzzleOffset: [0, 1.35, 1.1] },
  SU_RedHQ: buildingProfile('SU_RedHQ', 11),
  SU_ThermalPower: buildingProfile('SU_ThermalPower', 6),
  SU_OreRefinery: buildingProfile('SU_OreRefinery', 9),
  SU_MobilizationBarracks: buildingProfile('SU_MobilizationBarracks', 7),
  SU_CommandRadar: buildingProfile('SU_CommandRadar', 7),
  SU_KorshunGunship: vehicleProfile('SU_KorshunGunship', .28),
  AL_CommandHQ: buildingProfile('AL_CommandHQ', 11),
  AL_FissionReactor: buildingProfile('AL_FissionReactor', 6),
  AL_RefiningComplex: buildingProfile('AL_RefiningComplex', 9),
  AL_InfantryBarracks: buildingProfile('AL_InfantryBarracks', 7),
  AL_ArmorWorks: buildingProfile('AL_ArmorWorks', 10),
  AL_IntelCenter: buildingProfile('AL_IntelCenter', 7),
  AL_SentryTurret: buildingProfile('AL_SentryTurret', 4),
  AL_PioneerHarvester: vehicleProfile('AL_PioneerHarvester'),
  AL_BulwarkMBT: vehicleProfile('AL_BulwarkMBT'),
  AL_SentinelRifleman: infantryProfile('AL_SentinelRifleman'),
  AL_VectorVTOL: vehicleProfile('AL_VectorVTOL', .28),
  CO_DynastyHQ: buildingProfile('CO_DynastyHQ', 11),
  CO_SolarNode: buildingProfile('CO_SolarNode', 6),
  CO_NaniteRefinery: buildingProfile('CO_NaniteRefinery', 9),
  CO_VanguardBarracks: buildingProfile('CO_VanguardBarracks', 7),
  CO_MechaFactory: buildingProfile('CO_MechaFactory', 10),
  CO_SyncMatrix: buildingProfile('CO_SyncMatrix', 7),
  CO_PulsePylon: buildingProfile('CO_PulsePylon', 4),
  CO_YuanCollector: vehicleProfile('CO_YuanCollector'),
  CO_QinglongMBT: vehicleProfile('CO_QinglongMBT'),
  CO_QianweiRifleman: infantryProfile('CO_QianweiRifleman'),
  CO_LeiheGunship: vehicleProfile('CO_LeiheGunship', .28),
  CH_TemporalHQ: buildingProfile('CH_TemporalHQ', 11),
  CH_SingularityCore: buildingProfile('CH_SingularityCore', 6),
  CH_FluxRefinery: buildingProfile('CH_FluxRefinery', 9),
  CH_AssemblyNode: buildingProfile('CH_AssemblyNode', 7),
  CH_Chronoworks: buildingProfile('CH_Chronoworks', 10),
  CH_CausalityLab: buildingProfile('CH_CausalityLab', 7),
  CH_StasisEmitter: buildingProfile('CH_StasisEmitter', 4),
  CH_ProbabilistHarvester: vehicleProfile('CH_ProbabilistHarvester'),
  CH_TimelineTank: vehicleProfile('CH_TimelineTank'),
  CH_ResonanceRifleman: infantryProfile('CH_ResonanceRifleman'),
  CH_TrailGunship: vehicleProfile('CH_TrailGunship', .28),
};

export function getGameplayAssetProfile(specId: string): GameplayAssetProfile | undefined {
  const profile = profiles[specId];
  if (profile) return profile;

  if (!specId.includes('_')) return undefined;
  const isInfantry = /Rifleman|Team|Engineer|Technician|Lancer|Sniper|Medic|Operative|Officer|Trooper/.test(specId);
  return isInfantry ? infantryProfile(specId) : vehicleProfile(specId);
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
