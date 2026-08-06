#!/usr/bin/env node
import { GameDoctorRunner } from './runner.js';
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
    if (command === 'perf-probe') {
        console.log(`🏥 RA4 GAME DOCTOR — Contention-Immune Performance Probe`);
        const { workCount } = await import('./perfProbe.js');
        const result = workCount();
        console.log(`🔬 [PerfProbe] ${JSON.stringify(result, null, 2)}`);
        console.log(`🔬 [PerfProbe] Compare 'visitsPerEntityTick' (${result.visitsPerEntityTick}) across builds — it is load-independent.`);
        process.exit(0);
    }
    if (command === 'multiplayer-two-browsers') {
        console.log(`🏥 RA4 GAME DOCTOR — Two-Browser Multiplayer Gate`);
        const { runMultiplayerTwoBrowsers } = await import('./multiplayerTwoBrowsers.js');
        const ok = await runMultiplayerTwoBrowsers();
        process.exit(ok ? 0 : 1);
    }
    const validModes = ['audit', 'play', 'headless', 'visual', 'stress', 'soak', 'report', 'visual-audit'];
    const mode = validModes.includes(command) ? command : 'audit';
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
