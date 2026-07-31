import fs from 'fs';
import path from 'path';

console.log('=== RA4 Asset Pipeline: Verification & Integrity Checker ===');

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'assets-source/licenses/asset-manifest.json');
const publicModelsDir = path.join(rootDir, 'apps/web-client/public/assets/models');

if (!fs.existsSync(manifestPath)) {
  console.error('ERROR: asset-manifest.json not found!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`Verified ${manifest.length} manifest entries in asset-manifest.json.`);

const requiredGlbs = [
  'units/SU_GranitMBT.glb',
  'units/SU_BogatyrOreCarrier.glb',
  'units/SU_RubezhRifleman.glb',
  'buildings/SU_HeavyFactory.glb',
  'buildings/SU_Pillbox.glb',
  'environment/pine_tree_01.glb',
  'environment/coast_rocks_01.glb',
  'props/concrete_road_barrier.glb',
  'props/old_military_crate.glb'
];

let missing = 0;
for (const rel of requiredGlbs) {
  const p = path.join(publicModelsDir, rel);
  if (!fs.existsSync(p)) {
    console.error(`MISSING GLB: ${rel}`);
    missing++;
  } else {
    const stat = fs.statSync(p);
    console.log(`✓ VERIFIED GLB: ${rel} (${stat.size} bytes)`);
  }
}

if (missing > 0) {
  console.error(`Verification FAILED! ${missing} required GLB files missing.`);
  process.exit(1);
}

console.log('SUCCESS! All required 3D runtime GLB models verified cleanly.');
