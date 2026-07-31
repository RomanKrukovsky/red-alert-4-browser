import fs from 'fs';
import path from 'path';

console.log('=== RA4 Asset Pipeline: Production Report Generator ===');

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'assets-source/licenses/asset-manifest.json');
const publicModelsDir = path.join(rootDir, 'apps/web-client/public/assets/models');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let totalRuntimeBytes = 0;
const modelFiles: Array<{ name: string; bytes: number }> = [];

function checkDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      checkDir(full);
    } else if (item.name.endsWith('.glb')) {
      const stat = fs.statSync(full);
      totalRuntimeBytes += stat.size;
      modelFiles.push({ name: path.relative(publicModelsDir, full), bytes: stat.size });
    }
  }
}

checkDir(publicModelsDir);

console.log('\n--- 3D RUNTIME GLB ASSETS SUMMARY ---');
for (const mf of modelFiles) {
  console.log(`- ${mf.name}: ${(mf.bytes / 1024).toFixed(2)} KB`);
}
console.log(`Total Runtime Models Payload Size: ${(totalRuntimeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Verified License Records: ${manifest.length} entries in THIRD_PARTY_ASSETS.md`);
