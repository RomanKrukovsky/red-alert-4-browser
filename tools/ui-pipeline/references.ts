import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const rootDir = process.cwd();
const screenshotsDir = path.join(rootDir, 'SCREENSHOTS');
const artifactsDir = path.join(rootDir, 'artifacts/ui-comparison');
fs.mkdirSync(artifactsDir, { recursive: true });

const inventory = Array.from({ length: 24 }, (_, index) => {
  const file = `${index + 1}.png`;
  const fullPath = path.join(screenshotsDir, file);
  if (!fs.existsSync(fullPath)) return { file, exists: false, width: null, height: null, path: fullPath };
  const image = PNG.sync.read(fs.readFileSync(fullPath));
  return { file, exists: true, width: image.width, height: image.height, path: fullPath };
});

const missing = inventory.filter((item) => !item.exists);
fs.writeFileSync(path.join(artifactsDir, 'references-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), screenshotsDir, inventory }, null, 2));

for (const item of inventory) console.log(`${item.exists ? '✓' : '✗'} ${item.file}${item.exists ? ` — ${item.width}×${item.height}` : ' — отсутствует'}`);
if (missing.length > 0) throw new Error(`Не найдены эталоны: ${missing.map((item) => item.file).join(', ')}`);
console.log(`Каталог экранов: ${path.join(rootDir, 'docs/ui/REFERENCE_SCREEN_CATALOG.md')}`);
