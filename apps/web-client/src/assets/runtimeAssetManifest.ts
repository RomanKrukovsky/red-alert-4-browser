export type RuntimeAssetCategory = 'unit' | 'building' | 'environment' | 'prop';

export interface RuntimeAssetDefinition {
  id: string;
  url: string;
  category: RuntimeAssetCategory;
  rootNode: string;
  lods: Array<{ url: string; distance?: number; screenCoverage?: number }>;
  animations?: Record<string, string>;
  sockets?: { muzzle?: string; turretYaw?: string; gunPitch?: string; selection?: string; healthBar?: string; oreFill?: string; unload?: string; exitPoint?: string; rallyPoint?: string };
  collision?: { type: 'box' | 'sphere' | 'capsule' | 'mesh'; node?: string };
  castShadows: boolean;
  receiveShadows: boolean;
  instancing: 'none' | 'instance' | 'thin-instance';
}

const gameplayAsset = (id: string, fileId: string, category: 'unit' | 'building'): RuntimeAssetDefinition => ({
  id,
  url: `/assets/models/${category === 'unit' ? 'units' : 'buildings'}/${fileId}_LOD0.glb`,
  category,
  rootNode: category === 'unit' ? 'VehicleRoot' : 'BuildingRoot',
  lods: [],
  sockets: { muzzle: 'Muzzle', turretYaw: 'TurretYaw', selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor', exitPoint: 'ExitPoint' },
  collision: { type: 'mesh', node: 'CollisionRoot' },
  castShadows: true,
  receiveShadows: true,
  instancing: 'instance',
});

const factionGameplayAssets: RuntimeAssetDefinition[] = [
  // Soviet Union
  gameplayAsset('SU_RedHQ', 'SU_ConYard', 'building'),
  gameplayAsset('SU_ConYard', 'SU_ConYard', 'building'),
  gameplayAsset('SU_ThermalPower', 'SU_PowerPlant', 'building'),
  gameplayAsset('SU_PowerPlant', 'SU_PowerPlant', 'building'),
  gameplayAsset('SU_OreRefinery', 'SU_Refinery', 'building'),
  gameplayAsset('SU_Refinery', 'SU_Refinery', 'building'),
  gameplayAsset('SU_MobilizationBarracks', 'SU_Barracks', 'building'),
  gameplayAsset('SU_Barracks', 'SU_Barracks', 'building'),
  gameplayAsset('SU_CommandRadar', 'SU_Radar', 'building'),
  gameplayAsset('SU_Radar', 'SU_Radar', 'building'),
  gameplayAsset('SU_HeavyFactory', 'SU_HeavyFactory', 'building'),
  gameplayAsset('SU_WarFactory', 'SU_HeavyFactory', 'building'),
  gameplayAsset('SU_Pillbox', 'SU_Pillbox', 'building'),
  gameplayAsset('SU_Bunker', 'SU_Bunker', 'building'),
  gameplayAsset('SU_TeslaTower', 'SU_TeslaTower', 'building'),

  // Alliance
  gameplayAsset('AL_CommandHQ', 'AL_ConYard', 'building'),
  gameplayAsset('AL_ConYard', 'AL_ConYard', 'building'),
  gameplayAsset('AL_FissionReactor', 'AL_PowerPlant', 'building'),
  gameplayAsset('AL_PowerPlant', 'AL_PowerPlant', 'building'),
  gameplayAsset('AL_RefiningComplex', 'AL_Refinery', 'building'),
  gameplayAsset('AL_Refinery', 'AL_Refinery', 'building'),
  gameplayAsset('AL_InfantryBarracks', 'AL_Barracks', 'building'),
  gameplayAsset('AL_Barracks', 'AL_Barracks', 'building'),
  gameplayAsset('AL_ArmorWorks', 'AL_WarFactory', 'building'),
  gameplayAsset('AL_WarFactory', 'AL_WarFactory', 'building'),
  gameplayAsset('AL_IntelCenter', 'AL_TechCenter', 'building'),
  gameplayAsset('AL_TechCenter', 'AL_TechCenter', 'building'),
  gameplayAsset('AL_SentryTurret', 'AL_GunTurret', 'building'),
  gameplayAsset('AL_GunTurret', 'AL_GunTurret', 'building'),
  gameplayAsset('AL_PrismTower', 'AL_PrismTower', 'building'),

  // Coalition
  gameplayAsset('CO_DynastyHQ', 'CO_ConYard', 'building'),
  gameplayAsset('CO_ConYard', 'CO_ConYard', 'building'),
  gameplayAsset('CO_SolarNode', 'CO_PowerPlant', 'building'),
  gameplayAsset('CO_PowerPlant', 'CO_PowerPlant', 'building'),
  gameplayAsset('CO_NaniteRefinery', 'CO_Refinery', 'building'),
  gameplayAsset('CO_Refinery', 'CO_Refinery', 'building'),
  gameplayAsset('CO_VanguardBarracks', 'CO_Barracks', 'building'),
  gameplayAsset('CO_Barracks', 'CO_Barracks', 'building'),
  gameplayAsset('CO_MechaFactory', 'CO_WarFactory', 'building'),
  gameplayAsset('CO_WarFactory', 'CO_WarFactory', 'building'),
  gameplayAsset('CO_SyncMatrix', 'CO_TechCenter', 'building'),
  gameplayAsset('CO_TechCenter', 'CO_TechCenter', 'building'),
  gameplayAsset('CO_PulsePylon', 'CO_GunTurret', 'building'),
  gameplayAsset('CO_GunTurret', 'CO_GunTurret', 'building'),

  // Chronolegion
  gameplayAsset('CH_TemporalHQ', 'CH_ConYard', 'building'),
  gameplayAsset('CH_ConYard', 'CH_ConYard', 'building'),
  gameplayAsset('CH_SingularityCore', 'CH_PowerPlant', 'building'),
  gameplayAsset('CH_PowerPlant', 'CH_PowerPlant', 'building'),
  gameplayAsset('CH_FluxRefinery', 'CH_Refinery', 'building'),
  gameplayAsset('CH_Refinery', 'CH_Refinery', 'building'),
  gameplayAsset('CH_AssemblyNode', 'CH_Barracks', 'building'),
  gameplayAsset('CH_Barracks', 'CH_Barracks', 'building'),
  gameplayAsset('CH_Chronoworks', 'CH_WarFactory', 'building'),
  gameplayAsset('CH_WarFactory', 'CH_WarFactory', 'building'),
  gameplayAsset('CH_CausalityLab', 'CH_TechCenter', 'building'),
  gameplayAsset('CH_TechCenter', 'CH_TechCenter', 'building'),
  gameplayAsset('CH_StasisEmitter', 'CH_EchoTurret', 'building'),
  gameplayAsset('CH_EchoTurret', 'CH_EchoTurret', 'building'),

  // Units
  gameplayAsset('SU_KorshunGunship', 'SU_KorshunGunship', 'unit'),
  gameplayAsset('AL_PioneerHarvester', 'AL_PioneerHarvester', 'unit'),
  gameplayAsset('AL_BulwarkMBT', 'AL_BulwarkMBT', 'unit'),
  gameplayAsset('AL_SentinelRifleman', 'AL_SentinelRifleman', 'unit'),
  gameplayAsset('AL_VectorVTOL', 'AL_VectorVTOL', 'unit'),
  gameplayAsset('CO_YuanCollector', 'CO_YuanCollector', 'unit'),
  gameplayAsset('CO_QinglongMBT', 'CO_QinglongMBT', 'unit'),
  gameplayAsset('CO_QianweiRifleman', 'CO_QianweiRifleman', 'unit'),
  gameplayAsset('CO_LeiheGunship', 'CO_LeiheGunship', 'unit'),
  gameplayAsset('CH_ProbabilistHarvester', 'CH_ProbabilistHarvester', 'unit'),
  gameplayAsset('CH_TimelineTank', 'CH_TimelineTank', 'unit'),
  gameplayAsset('CH_ResonanceRifleman', 'CH_ResonanceRifleman', 'unit'),
  gameplayAsset('CH_TrailGunship', 'CH_TrailGunship', 'unit'),
];

const additionalGameplayAssets: RuntimeAssetDefinition[] = [
  ...[
    'SU_ZaslonAATeam', 'SU_MasterEngineer', 'SU_RysScout', 'SU_ZarevoMLRS', 'SU_BuranPatrolBoat', 'SU_VoevodaHeavyTank', 'SU_GromadaAirship', 'SU_MorokSubmarine',
    'AL_LancerTeam', 'AL_FieldEngineer', 'AL_KestrelScout', 'AL_OracleArtillery', 'AL_MantaPatrolCraft', 'AL_CitadelTank',
    'CO_VajraLancer', 'CO_JieTechnician', 'CO_KamakiriWalker', 'CO_AiravataWalker', 'CO_MonsoonArtillery', 'CO_KazekiriCorvette',
    'CH_PunctureLancer', 'CH_CausalityEngineer', 'CH_ParallaxScout', 'CH_DeltaDelayArtillery', 'CH_IsobathFrigate', 'CH_GapInterceptor',
  ].map((id) => gameplayAsset(id, id, 'unit')),
];

export const runtimeAssetManifest: RuntimeAssetDefinition[] = [
  { id: 'SU_GranitMBT', url: '/assets/models/units/SU_GranitMBT_LOD0.glb', category: 'unit', rootNode: 'VehicleRoot', lods: [{ url: '/assets/models/units/SU_GranitMBT_LOD1.glb', distance: 28 }, { url: '/assets/models/units/SU_GranitMBT_LOD2.glb', distance: 48 }], sockets: { muzzle: 'Muzzle', turretYaw: 'TurretYaw', gunPitch: 'GunPitch', selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'SU_BogatyrOreCarrier', url: '/assets/models/units/SU_BogatyrOreCarrier_LOD0.glb', category: 'unit', rootNode: 'VehicleRoot', lods: [{ url: '/assets/models/units/SU_BogatyrOreCarrier_LOD1.glb', distance: 28 }, { url: '/assets/models/units/SU_BogatyrOreCarrier_LOD2.glb', distance: 48 }], sockets: { selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor', oreFill: 'OreFillAnchor', unload: 'UnloadSocket' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'SU_RubezhRifleman', url: '/assets/models/units/SU_RubezhRifleman_LOD0.glb', category: 'unit', rootNode: 'CharacterRoot', lods: [], animations: { idle: 'Idle_Gun', walk: 'Walk', run: 'Run', aim: 'Idle_Gun_Pointing', fire: 'Idle_Gun_Shoot', hit: 'HitRecieve', death: 'Death' }, sockets: { muzzle: 'Muzzle', selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'none' },
  { id: 'ENV_PineTree01', url: '/assets/models/environment/pine_tree_01_LOD0.glb', category: 'environment', rootNode: 'PropRoot', lods: [{ url: '/assets/models/environment/pine_tree_01_LOD1.glb', distance: 25 }, { url: '/assets/models/environment/pine_tree_01_LOD2.glb', distance: 44 }], collision: { type: 'capsule' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'ENV_CoastRocks01', url: '/assets/models/environment/coast_rocks_01_LOD0.glb', category: 'environment', rootNode: 'PropRoot', lods: [{ url: '/assets/models/environment/coast_rocks_01_LOD1.glb', distance: 28 }, { url: '/assets/models/environment/coast_rocks_01_LOD2.glb', distance: 50 }], collision: { type: 'mesh' }, castShadows: false, receiveShadows: true, instancing: 'instance' },
  { id: 'PROP_ConcreteBarrier', url: '/assets/models/props/concrete_road_barrier_LOD0.glb', category: 'prop', rootNode: 'PropRoot', lods: [{ url: '/assets/models/props/concrete_road_barrier_LOD1.glb', distance: 32 }], collision: { type: 'box' }, castShadows: false, receiveShadows: true, instancing: 'instance' },
  { id: 'PROP_MilitaryCrate', url: '/assets/models/props/old_military_crate_LOD0.glb', category: 'prop', rootNode: 'PropRoot', lods: [{ url: '/assets/models/props/old_military_crate_LOD1.glb', distance: 28 }], collision: { type: 'box' }, castShadows: false, receiveShadows: true, instancing: 'instance' },
  ...factionGameplayAssets,
  ...additionalGameplayAssets,
];

export const runtimeAssetById = new Map(runtimeAssetManifest.map((asset) => [asset.id, asset]));
