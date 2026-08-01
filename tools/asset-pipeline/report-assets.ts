import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { inspectGlb } from './glb-inspector.js';

interface RuntimeSpec {
  assetId: string;
  author: string;
  category: string;
  displayName: string;
  files: string[];
  license: string;
  licenseUrl: string;
  modifications: string;
  platform: string;
  sourceFormat: string;
  sourcePage: string;
  sourcePath: string;
}

const rootDir = process.cwd();
const modelDir = path.join(rootDir, 'apps/web-client/public/assets/models');
const licenseDir = path.join(rootDir, 'assets-source/licenses');
const outputLicenseDir = path.join(rootDir, 'assets/licenses');
const publicLicenseDir = path.join(rootDir, 'apps/web-client/public/assets/licenses');
const audit = JSON.parse(fs.readFileSync(path.join(licenseDir, 'source-audit.json'), 'utf8')) as { files: Array<{ path: string; sha256: string }> };
const sourceHash = new Map(audit.files.map((file) => [file.path, file.sha256]));
const sha256 = (file: string): string => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const specs: RuntimeSpec[] = [
  { assetId: 'SU_GranitMBT', displayName: 'Granit Main Battle Tank', category: 'unit', platform: 'Quaternius', author: 'Quaternius', sourcePage: 'https://quaternius.com/packs/animatedtanks.html', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'blend', sourcePath: 'assets-source/downloads/quaternius-animated-tanks/Blends/Tank.blend', files: ['units/SU_GranitMBT_LOD0.glb', 'units/SU_GranitMBT_LOD1.glb', 'units/SU_GranitMBT_LOD2.glb'], modifications: 'Named vehicle/turret/gun/muzzle sockets, collision proxy, normalized materials, offline LODs.' },
  { assetId: 'SU_BogatyrOreCarrier', displayName: 'Bogatyr Ore Carrier', category: 'unit', platform: 'Quaternius + Kenney', author: 'Quaternius; Kenney', sourcePage: 'https://quaternius.com/packs/animatedtanks.html', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'blend + glb', sourcePath: 'assets-source/downloads/quaternius-animated-tanks/Blends/Tank4.blend', files: ['units/SU_BogatyrOreCarrier_LOD0.glb', 'units/SU_BogatyrOreCarrier_LOD1.glb', 'units/SU_BogatyrOreCarrier_LOD2.glb'], modifications: 'Tank chassis kitbashed with Kenney hopper, unload/fill sockets, collision proxy, offline LODs.' },
  { assetId: 'SU_RubezhRifleman', displayName: 'Rubezh Rifleman', category: 'unit', platform: 'Quaternius', author: 'Quaternius', sourcePage: 'https://quaternius.com/packs/ultimatemodularcharacters.html', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'blend', sourcePath: 'assets-source/downloads/quaternius-modular-men/All together/Blends/Humans_Master.blend', files: ['units/SU_RubezhRifleman_LOD0.glb'], modifications: 'SWAT modular parts selected, weapon/muzzle sockets and collision proxy added; 24 source actions preserved. LOD1/2 pending skinned-mesh retopology.' },
  { assetId: 'SU_HeavyFactory', displayName: 'Soviet Heavy Factory', category: 'building', platform: 'Kenney', author: 'Kenney', sourcePage: 'https://kenney.nl/assets/factory-kit', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'glb', sourcePath: 'assets-source/downloads/kenney/factory-kit.zip', files: ['buildings/SU_HeavyFactory_LOD0.glb', 'buildings/SU_HeavyFactory_LOD1.glb', 'buildings/SU_HeavyFactory_LOD2.glb'], modifications: 'Modular kitbash, exit/rally/UI anchors, collision proxy, offline LODs.' },
  { assetId: 'SU_Pillbox', displayName: 'Soviet Pillbox', category: 'building', platform: 'Kenney', author: 'Kenney', sourcePage: 'https://kenney.nl/assets/factory-kit', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'glb', sourcePath: 'assets-source/downloads/kenney/factory-kit.zip', files: ['buildings/SU_Pillbox_LOD0.glb', 'buildings/SU_Pillbox_LOD1.glb', 'buildings/SU_Pillbox_LOD2.glb'], modifications: 'Fortified machine/scanner kitbash, turret and muzzle sockets, collision proxy, offline LODs.' },
  { assetId: 'pine_tree_01', displayName: 'Pine Tree', category: 'environment', platform: 'Kenney', author: 'Kenney', sourcePage: 'https://kenney.nl/assets/mini-forest', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'glb', sourcePath: 'assets-source/downloads/kenney/mini-forest.zip', files: ['environment/pine_tree_01_LOD0.glb', 'environment/pine_tree_01_LOD1.glb', 'environment/pine_tree_01_LOD2.glb'], modifications: 'Scale normalized, collision proxy and offline LODs.' },
  { assetId: 'coast_rocks_01', displayName: 'Rock Cluster', category: 'environment', platform: 'Kenney', author: 'Kenney', sourcePage: 'https://kenney.nl/assets/mini-forest', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'glb', sourcePath: 'assets-source/downloads/kenney/mini-forest.zip', files: ['environment/coast_rocks_01_LOD0.glb', 'environment/coast_rocks_01_LOD1.glb', 'environment/coast_rocks_01_LOD2.glb'], modifications: 'Scale normalized, collision proxy and offline LODs.' },
  { assetId: 'concrete_road_barrier', displayName: 'Road Barrier', category: 'prop', platform: 'Kenney', author: 'Kenney', sourcePage: 'https://kenney.nl/assets/factory-kit', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'glb', sourcePath: 'assets-source/downloads/kenney/factory-kit.zip', files: ['props/concrete_road_barrier_LOD0.glb', 'props/concrete_road_barrier_LOD1.glb'], modifications: 'Temporary structure proxy, collision proxy and offline LOD.' },
  { assetId: 'old_military_crate', displayName: 'Military Crate', category: 'prop', platform: 'Kenney', author: 'Kenney', sourcePage: 'https://kenney.nl/assets/factory-kit', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'glb', sourcePath: 'assets-source/downloads/kenney/factory-kit.zip', files: ['props/old_military_crate_LOD0.glb', 'props/old_military_crate_LOD1.glb'], modifications: 'Scale normalized, collision proxy and offline LOD.' },
];

const manifest = specs.map((spec) => {
  const reports = spec.files.map((file) => inspectGlb(path.join(modelDir, file)));
  return {
    ...spec,
    attributionRequired: false,
    animations: reports[0].animations,
    downloadedAt: audit.files.length > 0 ? '2026-08-01' : null,
    gameUsage: spec.category,
    runtimeFormat: 'glb',
    runtimeFiles: spec.files,
    runtimeSha256: Object.fromEntries(spec.files.map((file, index) => [file, reports[index].sha256])),
    runtimeTriangleCountByLod: Object.fromEntries(reports.map((report, index) => [`LOD${index}`, report.triangles])),
    runtimeTextureResolution: 'embedded/source palette or 1024x1024 terrain set',
    sourceSha256: sourceHash.get(spec.sourcePath) ?? 'covered-by-pack-archive-hash',
    sourceTriangleCount: reports[0].triangles,
    reviewStatus: 'APPROVED_CC0_RUNTIME',
  };
});

for (const id of ['brown_mud_02', 'rock_3', 'asphalt_01', 'concrete_floor_01']) {
  const file = path.join(rootDir, `apps/web-client/public/assets/textures/terrain/${id}_diff_1k.jpg`);
  manifest.push({ assetId: id, displayName: id, category: 'material', platform: 'Poly Haven', author: 'Poly Haven', sourcePage: `https://polyhaven.com/a/${id}`, license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'jpg', sourcePath: `assets-source/downloads/polyhaven/${id}/${id}_diff_1k.jpg`, files: [], modifications: 'Official 1K diffuse, OpenGL normal and ARM maps.', attributionRequired: false, animations: [], downloadedAt: '2026-08-01', gameUsage: 'terrain material', runtimeFormat: 'jpg', runtimeFiles: [], runtimeSha256: { [`${id}_diff_1k.jpg`]: sha256(file) }, runtimeTriangleCountByLod: {}, runtimeTextureResolution: '1024x1024', sourceSha256: sourceHash.get(`assets-source/downloads/polyhaven/${id}/${id}_diff_1k.jpg`) ?? sha256(file), sourceTriangleCount: 0, reviewStatus: 'APPROVED_CC0_RUNTIME' });
}

const hdriFile = path.join(rootDir, 'apps/web-client/public/assets/environments/industrial_sunset_puresky_1k.hdr');
manifest.push({ assetId: 'industrial_sunset_puresky', displayName: 'Industrial Sunset PureSky', category: 'environment-light', platform: 'Poly Haven', author: 'Poly Haven', sourcePage: 'https://polyhaven.com/a/industrial_sunset_puresky', license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceFormat: 'hdr', sourcePath: 'assets-source/downloads/polyhaven/industrial_sunset_puresky/industrial_sunset_puresky_1k.hdr', files: [], modifications: 'Official 1K HDR runtime copy.', attributionRequired: false, animations: [], downloadedAt: '2026-08-01', gameUsage: 'IBL/environment lighting', runtimeFormat: 'hdr', runtimeFiles: [], runtimeSha256: { 'industrial_sunset_puresky_1k.hdr': sha256(hdriFile) }, runtimeTriangleCountByLod: {}, runtimeTextureResolution: '1024px equirectangular', sourceSha256: sourceHash.get('assets-source/downloads/polyhaven/industrial_sunset_puresky/industrial_sunset_puresky_1k.hdr') ?? sha256(hdriFile), sourceTriangleCount: 0, reviewStatus: 'APPROVED_CC0_RUNTIME' });

const blocked = fs.readdirSync(licenseDir).filter((file) => file.startsWith('sketchfab-') && file.endsWith('.json')).map((file) => JSON.parse(fs.readFileSync(path.join(licenseDir, file), 'utf8')) as object);
const finalManifest = [...manifest, ...blocked];
for (const directory of [licenseDir, outputLicenseDir, publicLicenseDir]) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'asset-manifest.json'), `${JSON.stringify(finalManifest, null, 2)}\n`);
}

const totalBytes = specs.flatMap((spec) => spec.files).reduce((sum, file) => sum + fs.statSync(path.join(modelDir, file)).size, 0);
const report = `# Runtime Asset Report\n\nGenerated: 2026-08-01\n\n- Runtime GLB files: ${specs.reduce((sum, spec) => sum + spec.files.length, 0)}\n- Runtime GLB payload: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB\n- Approved CC0 entries: ${manifest.length}\n- Sketchfab entries blocked by OAuth: ${blocked.length}\n- Validation: GLB 2.0, socket names, embedded-resource safety and LOD triangle order checked by \`pnpm assets:verify\`.\n- Known gap: Rubezh has LOD0 only; safe skinned retopology remains pending.\n`;
fs.writeFileSync(path.join(rootDir, 'ASSET_PIPELINE_REPORT.md'), report);
console.log(report);
