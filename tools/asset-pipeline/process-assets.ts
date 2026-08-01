import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const script = path.join(rootDir, 'tools/asset-pipeline/blender/process_runtime_assets.py');
const modelDir = path.join(rootDir, 'apps/web-client/public/assets/models');

interface BuildSpec {
  mode: string;
  source?: string;
  output: string;
  lods: Array<{ suffix: string; ratio: number }>;
}

const specs: BuildSpec[] = [
  { mode: 'tank', source: 'assets-source/downloads/quaternius-animated-tanks/Blends/Tank.blend', output: 'units/SU_GranitMBT', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .55 }, { suffix: 'LOD2', ratio: .25 }] },
  { mode: 'harvester', source: 'assets-source/downloads/quaternius-animated-tanks/Blends/Tank4.blend', output: 'units/SU_BogatyrOreCarrier', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .55 }, { suffix: 'LOD2', ratio: .25 }] },
  { mode: 'infantry', source: 'assets-source/downloads/quaternius-modular-men/All together/Blends/Humans_Master.blend', output: 'units/SU_RubezhRifleman', lods: [{ suffix: 'LOD0', ratio: 1 }] },
  { mode: 'factory', output: 'buildings/SU_HeavyFactory', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .55 }, { suffix: 'LOD2', ratio: .25 }] },
  { mode: 'pillbox', output: 'buildings/SU_Pillbox', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .55 }, { suffix: 'LOD2', ratio: .25 }] },
  { mode: 'tree', output: 'environment/pine_tree_01', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .5 }, { suffix: 'LOD2', ratio: .2 }] },
  { mode: 'rocks', output: 'environment/coast_rocks_01', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .5 }, { suffix: 'LOD2', ratio: .2 }] },
  { mode: 'barrier', output: 'props/concrete_road_barrier', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .45 }] },
  { mode: 'crate', output: 'props/old_military_crate', lods: [{ suffix: 'LOD0', ratio: 1 }, { suffix: 'LOD1', ratio: .45 }] },
];

if (!fs.existsSync(script)) throw new Error(`Blender script missing: ${script}`);
const version = spawnSync('blender', ['--version'], { encoding: 'utf8' });
if (version.status !== 0) throw new Error('Blender CLI is required for assets:process');
console.log(version.stdout.split('\n')[0]);

for (const spec of specs) {
  if (spec.source && !fs.existsSync(path.join(rootDir, spec.source))) throw new Error(`Source asset missing: ${spec.source}`);
  for (const lod of spec.lods) {
    const output = path.join(modelDir, `${spec.output}_${lod.suffix}.glb`);
    const args = spec.source
      ? ['--background', path.join(rootDir, spec.source), '--python', script, '--', spec.mode, output, String(lod.ratio)]
      : ['--background', '--factory-startup', '--python', script, '--', spec.mode, output, String(lod.ratio)];
    const result = spawnSync('blender', args, { cwd: rootDir, stdio: 'inherit', env: { ...process.env, RA4_ASSET_ROOT: rootDir } });
    if (result.status !== 0) throw new Error(`Blender failed: ${spec.mode} ${lod.suffix}`);
  }
}

console.log('Runtime GLB assets and offline LODs built with Blender.');
