#!/usr/bin/env node
/**
 * Sim-core purity guard.
 *
 * Fails the build if forbidden non-deterministic APIs appear inside
 * packages/sim-core sources. The simulation must never read wall-clock
 * time, schedule frames, or use unseeded randomness.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'packages', 'sim-core', 'src');

const FORBIDDEN = [
  { pattern: /\bMath\.random\s*\(/, name: 'Math.random()' },
  { pattern: /\bDate\.now\s*\(/, name: 'Date.now()' },
  { pattern: /\bperformance\.now\s*\(/, name: 'performance.now()' },
  { pattern: /\brequestAnimationFrame\s*\(/, name: 'requestAnimationFrame()' },
  { pattern: /\bsetTimeout\s*\(/, name: 'setTimeout()' },
  { pattern: /\bsetInterval\s*\(/, name: 'setInterval()' },
  { pattern: /\bnew\s+Date\s*\(\s*\)/, name: 'new Date()' },
  { pattern: /\bdocument\./, name: 'document (DOM access)' },
  { pattern: /\bwindow\./, name: 'window (DOM access)' },
  { pattern: /\bnavigator\./, name: 'navigator (browser API)' },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts') && !entry.includes('.test.')) {
      yield full;
    }
  }
}

const violations = [];
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return; // comments allowed
    for (const rule of FORBIDDEN) {
      if (rule.pattern.test(line)) {
        violations.push(`${relative(process.cwd(), file)}:${idx + 1}  ${rule.name}`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error('❌ SIM-CORE PURITY VIOLATIONS — forbidden non-deterministic API usage:');
  for (const v of violations) console.error('   ' + v);
  process.exit(1);
}
console.log('✅ sim-core purity check passed: no wall-clock, DOM, or unseeded RNG usage.');
