import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerType } from '@ra4/shared-types';
/**
 * Large-scale navigation & movement guarantees:
 *  1. Single unit navigates around an obstacle wall.
 *  2. 100 units converge on one goal without eternal jams.
 *  3. 500 crossing units keep moving (no deadlock) and never enter blocked tiles.
 *  4. Buildings block movement; destroying a building re-opens the tiles.
 *  5. Identical seed + commands => identical final checksum (path determinism).
 */
let failures = 0;
function check(name, cond, detail) {
    if (cond) {
        console.log(`  ✅ ${name}`);
    }
    else {
        failures++;
        console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    }
}
function createSim(seed) {
    const sim = new GameSimulation(seed);
    sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.HUMAN, team: 1 },
    ]);
    return sim;
}
function spawnRiflemen(sim, count, baseX, baseY, cols = 16) {
    const ids = [];
    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = Math.min(62000, baseX + col * 1200);
        const y = Math.min(62000, baseY + row * 1200);
        ids.push(sim.spawnUnit('SU_RubezhRifleman', 0, x, y));
    }
    return ids;
}
console.log('Running Navigation Scale & Determinism Tests...');
// ── Test 1: single unit routes around a wall ────────────────────────────────
{
    const sim = createSim(1001);
    // Wall of "buildings" across x=30 over most of the map height, gap at y=32
    for (let gy = 6; gy <= sim.mapHeight - 6; gy += 3) {
        if (gy >= 31 && gy <= 33)
            continue;
        sim.navigation.registerObstacle(30, gy, 3, 3);
    }
    const unitId = sim.spawnUnit('SU_RubezhRifleman', 0, 25000, 32000);
    sim.processCommands([{ type: CommandType.MOVE, entityIds: [unitId], targetX: 35000, targetY: 32000, playerIndex: 0, tick: 0 }]);
    for (let t = 0; t < 600; t++)
        sim.step();
    const unit = sim.entities.get(unitId);
    const arrived = Math.abs(unit.x - 35000) < 2500 && Math.abs(unit.y - 32000) < 2500;
    check('Single unit passes through wall gap', arrived, `final pos (${unit.x}, ${unit.y})`);
}
// ── Test 2: 100 units converge without eternal jam ──────────────────────────
{
    const sim = createSim(2002);
    const ids = spawnRiflemen(sim, 100, 10000, 10000);
    sim.processCommands([{ type: CommandType.MOVE, entityIds: ids, targetX: 50000, targetY: 50000, playerIndex: 0, tick: 0 }]);
    for (let t = 0; t < 1200; t++)
        sim.step();
    let arrivedCount = 0;
    for (const id of ids) {
        const e = sim.entities.get(id);
        // Formation slots for 100 units span ±9000 around the goal; allow slack for avoidance.
        if (e && Math.abs(e.x - 50000) < 12000 && Math.abs(e.y - 50000) < 12000)
            arrivedCount++;
    }
    check('100-unit group: ≥90% reach goal region', arrivedCount >= 90, `${arrivedCount}/100 arrived`);
}
// ── Test 3: 500 crossing units — no deadlock, no blocked-tile entry ────────
{
    const sim = createSim(3003);
    const groupA = spawnRiflemen(sim, 250, 8000, 8000);
    const groupB = spawnRiflemen(sim, 250, 44000, 44000);
    sim.processCommands([
        { type: CommandType.MOVE, entityIds: groupA, targetX: 48000, targetY: 48000, playerIndex: 0, tick: 0 },
        { type: CommandType.MOVE, entityIds: groupB, targetX: 12000, targetY: 12000, playerIndex: 0, tick: 0 },
    ]);
    const posBefore = new Map();
    for (const id of [...groupA, ...groupB]) {
        const e = sim.entities.get(id);
        posBefore.set(id, { x: e.x, y: e.y });
    }
    let blockedTileViolations = 0;
    for (let t = 0; t < 900; t++) {
        sim.step();
        // Skip the first window: units that spawned inside base footprints
        // legitimately need a short escape run before the invariant holds.
        if (t >= 100 && t % 100 === 0) {
            for (const id of [...groupA, ...groupB]) {
                const e = sim.entities.get(id);
                if (e && !sim.navigation.isWalkableWorld(e.x, e.y))
                    blockedTileViolations++;
            }
        }
    }
    let movedCount = 0;
    for (const id of [...groupA, ...groupB]) {
        const e = sim.entities.get(id);
        const before = posBefore.get(id);
        if (e && (Math.abs(e.x - before.x) > 5000 || Math.abs(e.y - before.y) > 5000))
            movedCount++;
    }
    check('500 crossing units: ≥80% made significant progress', movedCount >= 400, `${movedCount}/500 moved`);
    check('500 crossing units: zero blocked-tile entries', blockedTileViolations === 0, `${blockedTileViolations} violations`);
}
// ── Test 4: building blocks path; destruction re-opens it ──────────────────
{
    const sim = createSim(4004);
    // Corridor: block everything across x=30 except the corridor tile row y=32
    for (let gy = 1; gy < sim.mapHeight - 1; gy++) {
        if (gy >= 31 && gy <= 33)
            continue;
        sim.navigation.registerObstacle(30, gy, 3, 3);
    }
    // A building plugging the corridor
    const buildingId = sim.spawnBuilding('SU_HeavyFactory', 1, 30000, 32000);
    const unitId = sim.spawnUnit('SU_RubezhRifleman', 0, 20000, 32000);
    sim.processCommands([{ type: CommandType.MOVE, entityIds: [unitId], targetX: 40000, targetY: 32000, playerIndex: 0, tick: 0 }]);
    for (let t = 0; t < 400; t++)
        sim.step();
    const unitBlocked = sim.entities.get(unitId);
    const stillLeftOfWall = unitBlocked.x < 29000;
    check('Building plugs corridor: unit cannot pass', stillLeftOfWall, `unit at x=${unitBlocked.x}`);
    // Destroy the building, re-issue the order
    const building = sim.entities.get(buildingId);
    building.hp = 0;
    sim.step(); // purge + unregister obstacle
    sim.processCommands([{ type: CommandType.MOVE, entityIds: [unitId], targetX: 40000, targetY: 32000, playerIndex: 0, tick: 0 }]);
    for (let t = 0; t < 800; t++)
        sim.step();
    const unitAfter = sim.entities.get(unitId);
    check('Destroyed building re-opens path', Math.abs(unitAfter.x - 40000) < 3000, `unit at x=${unitAfter.x}`);
}
// ── Test 5: path determinism across runs ────────────────────────────────────
{
    const run = () => {
        const sim = createSim(5005);
        const ids = spawnRiflemen(sim, 60, 12000, 12000);
        sim.processCommands([{ type: CommandType.MOVE, entityIds: ids, targetX: 52000, targetY: 20000, playerIndex: 0, tick: 0 }]);
        for (let t = 0; t < 500; t++)
            sim.step();
        return sim.calculateChecksum();
    };
    const c1 = run();
    const c2 = run();
    check('Same seed + commands → identical movement checksum', c1 === c2, `${c1} vs ${c2}`);
}
if (failures > 0) {
    console.error(`FAILED: ${failures} navigation scale test(s) failed.`);
    process.exit(1);
}
console.log('SUCCESS! All Navigation Scale & Determinism Tests passed cleanly.');
//# sourceMappingURL=navigationScale.test.js.map