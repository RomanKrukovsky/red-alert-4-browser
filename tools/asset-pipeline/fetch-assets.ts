import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'assets-source/downloads');
const extractedDir = path.join(rootDir, 'assets-source/extracted');
const licensesDir = path.join(rootDir, 'assets-source/licenses');
const runtimeTexturesDir = path.join(rootDir, 'apps/web-client/public/assets/textures/terrain');
const runtimeEnvironmentDir = path.join(rootDir, 'apps/web-client/public/assets/environments');
const userAgent = 'RA4-Browser-AssetImporter/1.0';

for (const directory of [sourceDir, extractedDir, licensesDir, runtimeTexturesDir, runtimeEnvironmentDir]) fs.mkdirSync(directory, { recursive: true });

const sha256 = (file: string): string => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const download = async (url: string, target: string): Promise<void> => {
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return;
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
};

const run = (command: string, args: string[]): void => {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} failed with ${result.status}`);
};

const googleFiles = [
  { id: '1uaTlQ-HqN27if0knwsGTpL2NiQKFEKms', target: 'quaternius-animated-tanks/Blends/Tank.blend' },
  { id: '1hrG1XAUSpbCAtvxsOEdx0Csi-O4yTSAx', target: 'quaternius-animated-tanks/Blends/Tank4.blend' },
  { id: '1VuTMkuQymqZGmLIACWWMOI4lXLx0TCCY', target: 'quaternius-animated-tanks/License.txt' },
  { id: '1B9DlH0SacSiAlAdnk_Ra9tA0sEpkNAtT', target: 'quaternius-modular-men/All together/Blends/Humans_Master.blend' },
  { id: '1TTvylHa1CsiJuHFWWiv6PFGhLM-aAH5z', target: 'quaternius-modular-men/License.txt' },
];

const kenneyPacks = [
  { id: 'kenney-factory-kit', url: 'https://kenney.nl/media/pages/assets/factory-kit/edaac9d4f6-1777639602/kenney_factory-kit_3.0.zip', archive: 'kenney/factory-kit.zip', extracted: 'kenney-factory' },
  { id: 'kenney-city-kit-industrial', url: 'https://kenney.nl/media/pages/assets/city-kit-industrial/5fcb837741-1750838303/kenney_city-kit-industrial_1.0.zip', archive: 'kenney/city-kit-industrial.zip', extracted: 'kenney-industrial' },
  { id: 'kenney-mini-forest', url: 'https://kenney.nl/media/pages/assets/mini-forest/44a89aed7f-1784024079/kenney_mini-forest_1.0.zip', archive: 'kenney/mini-forest.zip', extracted: 'kenney-mini-forest' },
];

const polyHavenTextures = ['brown_mud_02', 'rock_3', 'asphalt_01', 'concrete_floor_01'];
const hdriId = 'industrial_sunset_puresky';

const blockedSketchfab = [
  ['91f495435f624d8b97a768f692aa6ce9', 'Military Landvehicle Kit 1.2'],
  ['df32789800154ac08778a8db932d9184', 'LPMAC Military Truck'],
  ['2d01eba3031f4db48eea8cdcc504b366', 'Military Character Kit 1.1'],
  ['7103a15d0c0141d6b3372e781e2f4e92', 'Military Character Kit Textured'],
  ['ae7ceaca7615424a91f0bd9a29ffc3d7', 'Military Outpost Kit 1.0'],
];
async function main(): Promise<void> {
  for (const file of googleFiles) {
    const target = path.join(sourceDir, file.target);
    if (!fs.existsSync(target)) run('uvx', ['--from', 'gdown', 'gdown', file.id, '-O', target]);
  }

  for (const pack of kenneyPacks) {
    const archive = path.join(sourceDir, pack.archive);
    await download(pack.url, archive);
    const output = path.join(extractedDir, pack.extracted);
    if (!fs.existsSync(path.join(output, 'Models'))) run('unzip', ['-q', '-o', archive, '-d', output]);
  }

  for (const id of polyHavenTextures) {
    const manifestPath = path.join(licensesDir, `${id}.files.json`);
    await download(`https://api.polyhaven.com/files/${id}`, manifestPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, Record<string, Record<string, { url: string }>>>;
    for (const [key, suffix] of [['Diffuse', 'diff'], ['nor_gl', 'nor_gl'], ['arm', 'arm']] as const) {
      const file = manifest[key]?.['1k']?.jpg;
      if (!file?.url) continue;
      const source = path.join(sourceDir, 'polyhaven', id, `${id}_${suffix}_1k.jpg`);
      await download(file.url, source);
      fs.copyFileSync(source, path.join(runtimeTexturesDir, path.basename(source)));
    }
  }

  const hdriManifestPath = path.join(licensesDir, `${hdriId}.files.json`);
  await download(`https://api.polyhaven.com/files/${hdriId}`, hdriManifestPath);
  const hdriManifest = JSON.parse(fs.readFileSync(hdriManifestPath, 'utf8')) as { hdri?: { '1k'?: { hdr?: { url: string } } } };
  const hdriUrl = hdriManifest.hdri?.['1k']?.hdr?.url;
  if (!hdriUrl) throw new Error('Poly Haven HDRI 1K URL missing');
  const hdriSource = path.join(sourceDir, 'polyhaven', hdriId, `${hdriId}_1k.hdr`);
  await download(hdriUrl, hdriSource);
  fs.copyFileSync(hdriSource, path.join(runtimeEnvironmentDir, `${hdriId}_1k.hdr`));

  const tokenPresent = Boolean(process.env.SKETCHFAB_OAUTH_TOKEN);
  for (const [uid, displayName] of blockedSketchfab) {
    const target = path.join(licensesDir, `sketchfab-${uid}.json`);
    if (!tokenPresent) fs.writeFileSync(target, JSON.stringify({ assetId: `sketchfab-${uid}`, displayName, status: 'BLOCKED_AUTH', reason: 'SKETCHFAB_OAUTH_TOKEN is not set; official download API was not called.', sourcePage: `https://sketchfab.com/3d-models/${uid}`, downloadApi: `https://api.sketchfab.com/v3/models/${uid}/download` }, null, 2));
  }

  const sourceAudit = {
    generatedAt: new Date().toISOString(),
    files: [
      ...googleFiles.map((file) => path.join(sourceDir, file.target)),
      ...kenneyPacks.map((pack) => path.join(sourceDir, pack.archive)),
      ...polyHavenTextures.map((id) => path.join(sourceDir, 'polyhaven', id, `${id}_diff_1k.jpg`)),
      hdriSource,
    ].filter(fs.existsSync).map((file) => ({ path: path.relative(rootDir, file), bytes: fs.statSync(file).size, sha256: sha256(file) })),
  };
  fs.writeFileSync(path.join(licensesDir, 'source-audit.json'), JSON.stringify(sourceAudit, null, 2));
  console.log(`Fetched and audited ${sourceAudit.files.length} official source files.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
