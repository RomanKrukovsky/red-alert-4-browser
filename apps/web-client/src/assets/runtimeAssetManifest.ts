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

export const runtimeAssetManifest: RuntimeAssetDefinition[] = [
  { id: 'SU_GranitMBT', url: '/assets/models/units/SU_GranitMBT_LOD0.glb', category: 'unit', rootNode: 'VehicleRoot', lods: [{ url: '/assets/models/units/SU_GranitMBT_LOD1.glb', distance: 28 }, { url: '/assets/models/units/SU_GranitMBT_LOD2.glb', distance: 48 }], sockets: { muzzle: 'Muzzle', turretYaw: 'TurretYaw', gunPitch: 'GunPitch', selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'SU_BogatyrOreCarrier', url: '/assets/models/units/SU_BogatyrOreCarrier_LOD0.glb', category: 'unit', rootNode: 'VehicleRoot', lods: [{ url: '/assets/models/units/SU_BogatyrOreCarrier_LOD1.glb', distance: 28 }, { url: '/assets/models/units/SU_BogatyrOreCarrier_LOD2.glb', distance: 48 }], sockets: { selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor', oreFill: 'OreFillAnchor', unload: 'UnloadSocket' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'SU_RubezhRifleman', url: '/assets/models/units/SU_RubezhRifleman_LOD0.glb', category: 'unit', rootNode: 'CharacterRoot', lods: [], animations: { idle: 'Idle_Gun', walk: 'Walk', run: 'Run', aim: 'Idle_Gun_Pointing', fire: 'Idle_Gun_Shoot', hit: 'HitRecieve', death: 'Death' }, sockets: { muzzle: 'Muzzle', selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'none' },
  { id: 'SU_HeavyFactory', url: '/assets/models/buildings/SU_HeavyFactory_LOD0.glb', category: 'building', rootNode: 'BuildingRoot', lods: [{ url: '/assets/models/buildings/SU_HeavyFactory_LOD1.glb', distance: 38 }, { url: '/assets/models/buildings/SU_HeavyFactory_LOD2.glb', distance: 62 }], sockets: { selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor', exitPoint: 'ExitPoint', rallyPoint: 'RallyPoint' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'SU_Pillbox', url: '/assets/models/buildings/SU_Pillbox_LOD0.glb', category: 'building', rootNode: 'BuildingRoot', lods: [{ url: '/assets/models/buildings/SU_Pillbox_LOD1.glb', distance: 30 }, { url: '/assets/models/buildings/SU_Pillbox_LOD2.glb', distance: 52 }], sockets: { muzzle: 'Muzzle', turretYaw: 'TurretYaw', gunPitch: 'GunPitch', selection: 'SelectionAnchor', healthBar: 'HealthBarAnchor' }, collision: { type: 'mesh', node: 'CollisionRoot' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'ENV_PineTree01', url: '/assets/models/environment/pine_tree_01_LOD0.glb', category: 'environment', rootNode: 'PropRoot', lods: [{ url: '/assets/models/environment/pine_tree_01_LOD1.glb', distance: 25 }, { url: '/assets/models/environment/pine_tree_01_LOD2.glb', distance: 44 }], collision: { type: 'capsule' }, castShadows: true, receiveShadows: true, instancing: 'instance' },
  { id: 'ENV_CoastRocks01', url: '/assets/models/environment/coast_rocks_01_LOD0.glb', category: 'environment', rootNode: 'PropRoot', lods: [{ url: '/assets/models/environment/coast_rocks_01_LOD1.glb', distance: 28 }, { url: '/assets/models/environment/coast_rocks_01_LOD2.glb', distance: 50 }], collision: { type: 'mesh' }, castShadows: false, receiveShadows: true, instancing: 'instance' },
  { id: 'PROP_ConcreteBarrier', url: '/assets/models/props/concrete_road_barrier_LOD0.glb', category: 'prop', rootNode: 'PropRoot', lods: [{ url: '/assets/models/props/concrete_road_barrier_LOD1.glb', distance: 32 }], collision: { type: 'box' }, castShadows: false, receiveShadows: true, instancing: 'instance' },
  { id: 'PROP_MilitaryCrate', url: '/assets/models/props/old_military_crate_LOD0.glb', category: 'prop', rootNode: 'PropRoot', lods: [{ url: '/assets/models/props/old_military_crate_LOD1.glb', distance: 28 }], collision: { type: 'box' }, castShadows: false, receiveShadows: true, instancing: 'instance' },
];

export const runtimeAssetById = new Map(runtimeAssetManifest.map((asset) => [asset.id, asset]));
