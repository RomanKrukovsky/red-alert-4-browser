import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { GameDoctorRunner } from './runner.js';
/**
 * Two-real-browser multiplayer gate (acceptance criterion #42).
 *
 * Launches the authoritative game server, the Vite dev server, then TWO
 * independent Chromium contexts. Each drives the actual UI:
 *
 *   Main menu → СЕТЕВАЯ ИГРА → connect → lobby → ready → host starts match
 *
 * Both browsers must then reach the in-match HUD, receive authoritative
 * ticks, and report checksums identical to each other — proving the
 * server-authoritative path works through the real interface, not just in
 * unit tests.
 */
const SERVER_PORT = 8090;
const CLIENT_PORT = 5174;
const SERVER_URL = `ws://127.0.0.1:${SERVER_PORT}/ws`;
async function waitForServer(timeoutMs = 40_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/health`);
            if (res.ok)
                return;
        }
        catch {
            // not up yet
        }
        await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error(`Game server did not become healthy on port ${SERVER_PORT}`);
}
function startGameServer() {
    console.log(`🎮 [MP-E2E] Starting authoritative game server on :${SERVER_PORT}...`);
    const child = spawn('node', ['apps/game-server/dist/index.js'], {
        env: { ...process.env, PORT: String(SERVER_PORT), HOST: '127.0.0.1', NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (chunk) => {
        const line = chunk.toString().trim();
        if (line.includes('running on') || line.includes('DESYNC'))
            console.log(`   [server] ${line.slice(0, 200)}`);
    });
    child.stderr?.on('data', (chunk) => {
        console.error(`   [server:err] ${chunk.toString().trim().slice(0, 300)}`);
    });
    return child;
}
/** Drive one browser through the network UI up to the lobby. */
async function joinLobbyViaUI(page, playerName) {
    await page.goto(`http://localhost:${CLIENT_PORT}/#/menu`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.ra4-main-navigation', { timeout: 30_000 });
    // Click the real menu button — it must not be a decorative/deferred item.
    const mpButton = page.locator('.ra4-main-navigation button', { hasText: 'СЕТЕВАЯ ИГРА' });
    await mpButton.waitFor({ timeout: 10_000 });
    const isDeferred = await mpButton.locator('small').count();
    if (isDeferred > 0)
        throw new Error('MULTIPLAYER menu item is still marked as deferred (dead button)');
    await mpButton.click();
    // Connect screen: set server URL and callsign, then connect.
    await page.waitForSelector('.ra4-connect-panel', { timeout: 10_000 });
    await page.fill('input[aria-label="Адрес сервера"]', SERVER_URL);
    await page.fill('input[aria-label="Позывной командира"]', playerName);
    await page.click('.ra4-connect-actions button:has-text("ПОДКЛЮЧИТЬСЯ")');
    // Lobby must appear, driven by the server's authoritative lobby state.
    await page.waitForSelector('.ra4-multiplayer-lobby', { timeout: 20_000 });
    await page.waitForFunction(() => document.querySelectorAll('.ra4-multiplayer-lobby .ra4-roster-row').length > 0, undefined, { timeout: 20_000 });
    console.log(`🤖 [MP-E2E] ${playerName} reached the network lobby.`);
}
export async function runMultiplayerTwoBrowsers() {
    const server = startGameServer();
    const runner = new GameDoctorRunner({ mode: 'headless', headless: true });
    let browserA = null;
    let browserB = null;
    let passed = false;
    try {
        await waitForServer();
        console.log('🎮 [MP-E2E] Game server healthy.');
        await runner.startDevServer(CLIENT_PORT);
        browserA = await chromium.launch({ headless: true });
        browserB = await chromium.launch({ headless: true });
        const pageA = await browserA.newPage();
        const pageB = await browserB.newPage();
        const consoleErrors = [];
        for (const [label, page] of [['A', pageA], ['B', pageB]]) {
            page.on('console', (msg) => {
                if (msg.type() === 'error')
                    consoleErrors.push(`[${label}] ${msg.text().slice(0, 200)}`);
            });
        }
        // Both players join the same room through the real UI.
        await joinLobbyViaUI(pageA, 'COMMANDER_A');
        await joinLobbyViaUI(pageB, 'COMMANDER_B');
        // Both mark ready.
        for (const page of [pageA, pageB]) {
            await page.click('.ra4-lobby-actions button:has-text("ГОТОВ К БОЮ")');
            await page.waitForTimeout(300);
        }
        console.log('🤖 [MP-E2E] Both commanders marked ready.');
        // The host selects the SECOND map, proving map selection is real: the
        // choice must propagate to the other client's lobby view and then to
        // the actual simulation both clients run.
        let selectedMapName = null;
        for (const page of [pageA, pageB]) {
            const mapSelect = page.locator('.ra4-lobby-map-select select');
            if (await mapSelect.count() > 0) {
                const options = await mapSelect.locator('option').all();
                if (options.length >= 2) {
                    const secondValue = await options[1].getAttribute('value');
                    selectedMapName = await options[1].textContent();
                    await mapSelect.selectOption(secondValue);
                    console.log(`🤖 [MP-E2E] Host selected map: ${selectedMapName} (${secondValue})`);
                    await page.waitForTimeout(600);
                }
                break;
            }
        }
        if (!selectedMapName)
            throw new Error('Host had no map selector — map selection is not wired');
        // The non-host client must see the host's map choice (lobby broadcast).
        const nonHostSeesMap = await Promise.all([pageA, pageB].map(async (page) => {
            const isHost = await page.locator('.ra4-lobby-map-select select').count() > 0;
            if (isHost)
                return true;
            const text = await page.locator('.ra4-lobby-left').innerText();
            return text.includes(selectedMapName.trim());
        }));
        if (nonHostSeesMap.some((seen) => !seen)) {
            throw new Error(`Non-host client did not receive the host's map selection (${selectedMapName})`);
        }
        console.log('🤖 [MP-E2E] Map selection propagated to the other client.');
        // The host starts the battle. Whichever page shows an enabled start
        // button is the host (server assigns hostIndex).
        let started = false;
        for (const page of [pageA, pageB]) {
            const startButton = page.locator('.ra4-lobby-actions button:has-text("НАЧАТЬ БИТВУ")');
            if (await startButton.count() > 0 && await startButton.isEnabled()) {
                await startButton.click();
                started = true;
                break;
            }
        }
        if (!started)
            throw new Error('Neither client presented an enabled "НАЧАТЬ БИТВУ" (host) button');
        console.log('🤖 [MP-E2E] Host started the match.');
        // Both clients must reach the in-match HUD driven by authoritative ticks.
        for (const [label, page] of [['A', pageA], ['B', pageB]]) {
            await page.waitForSelector('.ra4-gameplay-hud, #renderCanvas.is-visible', { timeout: 60_000 });
            await page.waitForFunction(() => {
                const probe = window.__RA4_GAME_DOCTOR__;
                return probe && typeof probe.getNetworkStatus === 'function' && probe.getNetworkStatus().tick > 0;
            }, undefined, { timeout: 60_000 });
            const probe = await page.evaluate(() => window.__RA4_GAME_DOCTOR__.getNetworkStatus());
            console.log(`🤖 [MP-E2E] Client ${label} in match: status=${probe.status} tick=${probe.tick}`);
        }
        // Let the authoritative match run long enough for several checksum
        // broadcasts (server broadcasts every 90 ticks ≈ 3 s at 30 Hz).
        console.log('🤖 [MP-E2E] Running authoritative match for 8 s...');
        await pageA.waitForTimeout(8000);
        const probeA = await pageA.evaluate(() => window.__RA4_GAME_DOCTOR__.getNetworkStatus());
        const probeB = await pageB.evaluate(() => window.__RA4_GAME_DOCTOR__.getNetworkStatus());
        const snapA = await pageA.evaluate(() => { const s = window.__RA4_GAME_DOCTOR__.getSnapshot(); return s ? { tick: s.tick, checksum: s.checksum, entities: s.entities.length } : null; });
        const snapB = await pageB.evaluate(() => { const s = window.__RA4_GAME_DOCTOR__.getSnapshot(); return s ? { tick: s.tick, checksum: s.checksum, entities: s.entities.length } : null; });
        // Same-tick checksum parity: comparing "latest" snapshots is meaningless
        // because the two clients are a few ticks apart in wall-clock terms.
        const historyA = await pageA.evaluate(() => window.__RA4_GAME_DOCTOR__.getChecksumHistory());
        const historyB = await pageB.evaluate(() => window.__RA4_GAME_DOCTOR__.getChecksumHistory());
        const commonTicks = Object.keys(historyA).filter((t) => t in historyB).map(Number).sort((a, b) => a - b);
        const mismatched = commonTicks.filter((t) => historyA[String(t)] !== historyB[String(t)]);
        console.log(`🔬 [MP-E2E] A: tick=${probeA.tick} desync=${probeA.desync} snapshot=${JSON.stringify(snapA)}`);
        console.log(`🔬 [MP-E2E] B: tick=${probeB.tick} desync=${probeB.desync} snapshot=${JSON.stringify(snapB)}`);
        console.log(`🔬 [MP-E2E] Common ticks compared: ${commonTicks.length}, mismatched: ${mismatched.length}`);
        // Visual record of both clients mid-match, for the fidelity ledger.
        const shotDir = path.join(process.cwd(), 'artifacts', 'game-doctor', 'multiplayer');
        mkdirSync(shotDir, { recursive: true });
        await pageA.screenshot({ path: path.join(shotDir, 'client-a-in-match.png') });
        await pageB.screenshot({ path: path.join(shotDir, 'client-b-in-match.png') });
        console.log(`📸 [MP-E2E] Screenshots written to artifacts/game-doctor/multiplayer/`);
        const failures = [];
        if (probeA.tick < 60)
            failures.push(`client A applied only ${probeA.tick} authoritative ticks`);
        if (probeB.tick < 60)
            failures.push(`client B applied only ${probeB.tick} authoritative ticks`);
        if (probeA.desync)
            failures.push('client A reported a desync against the server');
        if (probeB.desync)
            failures.push('client B reported a desync against the server');
        if (!snapA || !snapB)
            failures.push('a client produced no world snapshot');
        if (snapA && snapB && snapA.entities !== snapB.entities) {
            failures.push(`entity count mismatch: A=${snapA.entities} B=${snapB.entities}`);
        }
        if (commonTicks.length < 100) {
            failures.push(`only ${commonTicks.length} common ticks to compare (expected ≥100)`);
        }
        if (mismatched.length > 0) {
            const sample = mismatched.slice(0, 3).map((t) => `tick ${t}: A=${historyA[String(t)]} B=${historyB[String(t)]}`);
            failures.push(`cross-client checksum divergence at ${mismatched.length} tick(s): ${sample.join(' | ')}`);
        }
        // The host's map choice must be the map BOTH clients actually loaded —
        // not merely a label in the lobby.
        const mapA = await pageA.evaluate(() => window.__RA4_GAME_DOCTOR__.getMapInfo());
        const mapB = await pageB.evaluate(() => window.__RA4_GAME_DOCTOR__.getMapInfo());
        console.log(`🔬 [MP-E2E] Loaded map — A: ${mapA.mapId} (${mapA.width}x${mapA.height}), B: ${mapB.mapId} (${mapB.width}x${mapB.height})`);
        if (mapA.mapId !== mapB.mapId) {
            failures.push(`clients loaded different maps: A=${mapA.mapId} B=${mapB.mapId}`);
        }
        if (mapA.mapId === 'map_red_square_duel') {
            failures.push(`host selected the second map but clients loaded the default (${mapA.mapId}) — SET_MAP did not reach the match`);
        }
        const fatalConsole = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('WebGL'));
        if (fatalConsole.length > 0)
            failures.push(`console errors: ${fatalConsole.slice(0, 3).join(' | ')}`);
        if (failures.length > 0) {
            console.error('❌ [MP-E2E] TWO-BROWSER MULTIPLAYER GATE FAILED:');
            for (const f of failures)
                console.error(`   • ${f}`);
            return false;
        }
        console.log(`✅ [MP-E2E] TWO-BROWSER GATE PASSED — both real browsers played an authoritative match (A tick ${probeA.tick}, B tick ${probeB.tick}); ${commonTicks.length} common ticks checksum-identical across clients; zero desync vs server.`);
        passed = true;
        return true;
    }
    catch (error) {
        console.error('❌ [MP-E2E] Harness error:', error.message);
        return false;
    }
    finally {
        await browserA?.close();
        await browserB?.close();
        runner.stopDevServer();
        server.kill('SIGTERM');
        await new Promise((r) => setTimeout(r, 300));
        if (!server.killed)
            server.kill('SIGKILL');
        if (!passed)
            console.log('ℹ️  [MP-E2E] See logs above for the first failing step.');
    }
}
