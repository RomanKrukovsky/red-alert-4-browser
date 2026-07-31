import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RA4 Asset Pipeline: Blender & Model Converter ===');

const rootDir = process.cwd();
const publicModelsDir = path.join(rootDir, 'apps/web-client/public/assets/models');

fs.mkdirSync(path.join(publicModelsDir, 'units'), { recursive: true });
fs.mkdirSync(path.join(publicModelsDir, 'buildings'), { recursive: true });
fs.mkdirSync(path.join(publicModelsDir, 'environment'), { recursive: true });
fs.mkdirSync(path.join(publicModelsDir, 'props'), { recursive: true });

// Check Blender CLI availability
let hasBlender = false;
try {
  const versionOutput = execSync('blender --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  if (versionOutput.includes('Blender')) {
    hasBlender = true;
    console.log('Found system Blender CLI:', versionOutput.split('\n')[0]);
  }
} catch (e) {
  console.log('Blender CLI not detected in PATH. Using GLB Synthesizer/Fallback Pipeline.');
}

console.log(`Processing status: Blender ${hasBlender ? 'ACTIVE' : 'FALLBACK_JS_GLB_BUILDER'}`);
