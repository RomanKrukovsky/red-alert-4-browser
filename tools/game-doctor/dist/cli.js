#!/usr/bin/env node
import { GameDoctorRunner } from './runner.js';
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'audit';
    const validModes = ['audit', 'play', 'headless', 'visual', 'stress', 'soak', 'report'];
    const mode = validModes.includes(command) ? command : 'audit';
    const isHeadless = !args.includes('--headed');
    console.log(`🏥 ===========================================`);
    console.log(`🏥 RA4 GAME DOCTOR — Autonomous QA System`);
    console.log(`🏥 Mode: ${mode}`);
    console.log(`🏥 ===========================================`);
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
