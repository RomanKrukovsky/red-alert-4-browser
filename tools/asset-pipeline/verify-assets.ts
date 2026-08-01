import fs from 'node:fs';
import path from 'node:path';
import { inspectGlb } from './glb-inspector.js';

interface AssetSpec { files: string[]; sockets: string[] }

const rootDir = process.cwd();
const modelDir = path.join(rootDir, 'apps/web-client/public/assets/models');
const specs: AssetSpec[] = [
  { files: ['units/SU_GranitMBT_LOD0.glb', 'units/SU_GranitMBT_LOD1.glb', 'units/SU_GranitMBT_LOD2.glb'], sockets: ['VehicleRoot', 'TurretYaw', 'GunPitch', 'Muzzle', 'CollisionRoot'] },
  { files: ['units/SU_BogatyrOreCarrier_LOD0.glb', 'units/SU_BogatyrOreCarrier_LOD1.glb', 'units/SU_BogatyrOreCarrier_LOD2.glb'], sockets: ['VehicleRoot', 'OreFillAnchor', 'UnloadSocket', 'CollisionRoot'] },
  { files: ['units/SU_RubezhRifleman_LOD0.glb'], sockets: ['CharacterRoot', 'Weapon', 'Muzzle', 'CollisionRoot'] },
  { files: ['buildings/SU_HeavyFactory_LOD0.glb', 'buildings/SU_HeavyFactory_LOD1.glb', 'buildings/SU_HeavyFactory_LOD2.glb'], sockets: ['BuildingRoot', 'RallyPoint', 'ExitPoint', 'CollisionRoot'] },
  { files: ['buildings/SU_Pillbox_LOD0.glb', 'buildings/SU_Pillbox_LOD1.glb', 'buildings/SU_Pillbox_LOD2.glb'], sockets: ['BuildingRoot', 'TurretYaw', 'Muzzle', 'CollisionRoot'] },
  { files: ['environment/pine_tree_01_LOD0.glb', 'environment/pine_tree_01_LOD1.glb', 'environment/pine_tree_01_LOD2.glb'], sockets: ['CollisionRoot'] },
  { files: ['environment/coast_rocks_01_LOD0.glb', 'environment/coast_rocks_01_LOD1.glb', 'environment/coast_rocks_01_LOD2.glb'], sockets: ['CollisionRoot'] },
  { files: ['props/concrete_road_barrier_LOD0.glb', 'props/concrete_road_barrier_LOD1.glb'], sockets: ['CollisionRoot'] },
  { files: ['props/old_military_crate_LOD0.glb', 'props/old_military_crate_LOD1.glb'], sockets: ['CollisionRoot'] },
];

let failures = 0;
for (const spec of specs) {
  let previousTriangles = Number.POSITIVE_INFINITY;
  for (const [index, relativeFile] of spec.files.entries()) {
    const file = path.join(modelDir, relativeFile);
    if (!fs.existsSync(file)) { console.error(`MISSING ${relativeFile}`); failures += 1; continue; }
    const report = inspectGlb(file);
    const missingSockets = index === 0 ? spec.sockets.filter((socket) => !report.nodeNames.includes(socket)) : [];
    if (report.version !== '2.0' || report.triangles === 0 || report.externalUris.some((uri) => path.isAbsolute(uri)) || missingSockets.length > 0) {
      console.error(`INVALID ${relativeFile}: version=${report.version}, triangles=${report.triangles}, missing=${missingSockets.join(',')}`);
      failures += 1;
    }
    if (report.triangles > previousTriangles) { console.error(`LOD ORDER ${relativeFile}: ${report.triangles} > ${previousTriangles}`); failures += 1; }
    previousTriangles = report.triangles;
    console.log(`OK ${relativeFile}: ${report.triangles} tris, ${report.materials} materials, ${(report.bytes / 1024).toFixed(1)} KiB`);
  }
}

if (failures > 0) throw new Error(`Asset verification failed with ${failures} error(s).`);
console.log(`Verified ${specs.reduce((sum, spec) => sum + spec.files.length, 0)} GLB files.`);
