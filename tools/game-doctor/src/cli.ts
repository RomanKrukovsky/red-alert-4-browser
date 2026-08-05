#!/usr/bin/env node

import { GameDoctorRunner } from './runner.js';
import { GameDoctorOptions } from './types.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';

  if (command === 'stress-1500') {
    console.log(`🏥 RA4 GAME DOCTOR — 1500-Entity Stress Benchmark (WASM gate)`);
    const { runStressBenchmark1500 } = await import('./stressBenchmark1500.js');
    const report = runStressBenchmark1500();
    process.exit(report.passed ? 0 : 1);
  }

  if (command === 'cross-env-determinism') {
    console.log(`🏥 RA4 GAME DOCTOR — Cross-Environment Determinism Gate`);
    const { runCrossEnvDeterminism } = await import('./crossEnvDeterminism.js');
    const ok = await runCrossEnvDeterminism();
    process.exit(ok ? 0 : 1);
  }

  const validModes: GameDoctorOptions['mode'][] = ['audit', 'play', 'headless', 'visual', 'stress', 'soak', 'report', 'visual-audit'];
  const mode = validModes.includes(command as any) ? (command as GameDoctorOptions['mode']) : 'audit';

  const isHeadless = !args.includes('--headed');

  console.log(`🏥 ===========================================`);
  console.log(`🏥 RA4 GAME DOCTOR — Autonomous QA System`);
  console.log(`🏥 Mode: ${mode}`);
  console.log(`🏥 ===========================================`);

  if (mode === 'visual-audit') {
    const runner = new GameDoctorRunner({ mode: 'visual', headless: false });
    console.log('🌐 [RA4 Game Doctor] Launching Web Client Dev Server for UI Auditor...');
    await runner.startDevServer();
    const { UIAuditor } = await import('./uiAuditor.js');
    const uiAuditor = new UIAuditor(args[1] === 'after' ? 'after' : 'before');
    await uiAuditor.runAudit();
    runner.stopDevServer();
    process.exit(0);
  }

  const runner = new GameDoctorRunner({
    mode,
    headless: isHeadless,
  });

  const success = await runner.run();
  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Fatal error in Game Doctor CLI:', err);
  process.exit(1);
});
