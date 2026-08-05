import { chromium } from 'playwright';
import { GameSimulation } from '@ra4/sim-core';
import { FactionId, PlayerType } from '@ra4/shared-types';
import { GameDoctorRunner } from './runner.js';

/**
 * Cross-environment determinism gate.
 *
 * Runs the canonical scenario (seed 424242, USSR HUMAN vs Alliance AI_MEDIUM)
 * for N ticks in:
 *   1. Node (in-process, same code path as the authoritative match server)
 *   2. A real browser Web Worker (via window.__RA4_DETERMINISM_PROBE__)
 *
 * The final checksums MUST be identical. Any divergence means the sim would
 * desync between client prediction and server authority.
 */

const SEED = 424242;
const TICKS = 5000;

function runNodeSide(): number {
  const sim = new GameSimulation(SEED);
  sim.initMatch([
    { name: 'Player 1 (USSR)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'Player 2 (Alliance)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
  ]);
  for (let i = 0; i < TICKS; i++) sim.step();
  return sim.calculateChecksum();
}

export async function runCrossEnvDeterminism(): Promise<boolean> {
  console.log(`🔬 [CrossEnv] Node-side simulation: seed=${SEED}, ticks=${TICKS}...`);
  const nodeChecksum = runNodeSide();
  console.log(`🔬 [CrossEnv] Node checksum: ${nodeChecksum}`);

  const runner = new GameDoctorRunner({ mode: 'headless', headless: true });
  await runner.startDevServer();

  let browserChecksum: number | null = null;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:5173/#/splash', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof (window as any).__RA4_DETERMINISM_PROBE__ === 'function', undefined, { timeout: 30_000 });
    console.log(`🔬 [CrossEnv] Browser Worker simulation: seed=${SEED}, ticks=${TICKS}...`);
    browserChecksum = await page.evaluate(
      ([seed, ticks]) => (window as any).__RA4_DETERMINISM_PROBE__(seed, ticks) as Promise<number>,
      [SEED, TICKS]
    );
    console.log(`🔬 [CrossEnv] Browser checksum: ${browserChecksum}`);
  } finally {
    await browser.close();
    runner.stopDevServer();
  }

  if (browserChecksum === nodeChecksum) {
    console.log(`✅ [CrossEnv] DETERMINISM GATE PASSED — identical checksum ${nodeChecksum} in Node and browser Worker over ${TICKS} ticks.`);
    return true;
  }
  console.error(`❌ [CrossEnv] DESYNC — Node checksum ${nodeChecksum} != browser checksum ${browserChecksum}.`);
  return false;
}
