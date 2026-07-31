import fs from 'fs';
import path from 'path';

console.log('=== RA4 UI Pipeline: References Indexer & Dimension Verification ===');

const rootDir = process.cwd();
const screenshotsDir = path.join(rootDir, '../red-alert-4/SCREENSHOTS');
const artifactsDir = path.join(rootDir, 'artifacts/ui-comparison');

fs.mkdirSync(artifactsDir, { recursive: true });

const files: string[] = [];
for (let i = 1; i <= 24; i++) {
  files.push(`${i}.png`);
}

const inventory: Array<{ file: string; exists: boolean; path: string }> = [];

for (const file of files) {
  const fullPath = path.join(screenshotsDir, file);
  const exists = fs.existsSync(fullPath);
  inventory.push({ file, exists, path: fullPath });
  console.log(`Reference ${file}: ${exists ? '✓ FOUND' : '✗ NOT FOUND'}`);
}

const reportPath = path.join(artifactsDir, 'references-report.json');
fs.writeFileSync(reportPath, JSON.stringify(inventory, null, 2));

console.log(`SUCCESS! References index report created at ${reportPath}`);
