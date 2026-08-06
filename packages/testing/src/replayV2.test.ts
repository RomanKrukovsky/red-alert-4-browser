import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerCommand, PlayerType } from '@ra4/shared-types';
import { decodeReplay, ReplayFormatError, ReplayPlayerV2, ReplayRecorderV2, REPLAY_FORMAT_VERSION } from '@ra4/replay';
import { PROTOCOL_VERSION } from '@ra4/netcode';

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✅ ${name}`);
  else { failures++; console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log('Running Replay Format v2 Tests...');

const players = [
  { name: 'P1 (USSR)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
  { name: 'P2 (Alliance AI)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
];
const SEED = 777001;
const TICKS = 3000;

// ── Record a real match: live sim + scripted player commands + AI ────────
function recordMatch(): { bytes: Uint8Array; finalChecksum: number } {
  const sim = new GameSimulation(SEED);
  sim.initMatch(players, 10000);

  const recorder = new ReplayRecorderV2({
    mapId: 'map_red_square_duel',
    seed: SEED,
    tickRate: 30,
    simVersion: '1.0.0',
    contentHash: 'test',
    protocolVersion: PROTOCOL_VERSION,
    players,
    startingCredits: 10000,
    recordedAtIso: '2026-08-05T00:00:00.000Z',
    checkpointIntervalTicks: 300,
    keyframeIntervalTicks: 1000,
  });

  // Scripted human commands at fixed ticks (deterministic).
  const scripted = new Map<number, PlayerCommand[]>();
  scripted.set(60, [{ type: CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 22, gridY: 14, entityIds: [], playerIndex: 0, tick: 60 }]);
  // Entity 6 is player 0's starting harvester (5 buildings + harvester per player).
  scripted.set(600, [{ type: CommandType.MOVE, entityIds: [6], targetX: 40000, targetY: 40000, playerIndex: 0, tick: 600 }]);

  for (let t = 0; t < TICKS; t++) {
    const commands = scripted.get(t) ?? [];
    sim.processCommands(commands);
    sim.step();
    recorder.recordTick(sim, sim.tickIndex, commands);
  }
  recorder.recordResult(-1, 'test-cutoff');
  return { bytes: recorder.export(), finalChecksum: sim.calculateChecksum() };
}

const { bytes, finalChecksum } = recordMatch();
check(`Replay exported (${(bytes.byteLength / 1024).toFixed(1)} KiB)`, bytes.byteLength > 100);

// ── Container decode ──────────────────────────────────────────────────────
{
  const data = decodeReplay(bytes);
  check('Header: format version', data.header.formatVersion === REPLAY_FORMAT_VERSION);
  check('Header: seed/map/players', data.header.seed === SEED && data.header.mapId === 'map_red_square_duel' && data.header.players.length === 2);
  check('Frames: scripted commands recorded', data.frames.some((f) => f.tick === 61 || f.tick === 60));
  check(`Checkpoints present (${data.checkpoints.length})`, data.checkpoints.length >= 9);
  check(`Keyframes present (${data.keyframes.length})`, data.keyframes.length >= 2);
}

// ── Headless verification: re-simulation matches all checkpoints ─────────
{
  const player = new ReplayPlayerV2(bytes);
  const verification = player.verify();
  check(`Verification: ${verification.checkpointsChecked} checkpoints matched`, verification.verified,
    verification.firstDivergenceTick !== null ? `divergence at tick ${verification.firstDivergenceTick} (${verification.expectedChecksum} vs ${verification.actualChecksum})` : 'no checkpoints');
  check('Verification: final checksum identical to live match', player.sim.calculateChecksum() === finalChecksum,
    `${player.sim.calculateChecksum()} vs ${finalChecksum}`);
}

// ── Seek: forward, preview, and backward-restart determinism ─────────────
{
  const player = new ReplayPlayerV2(bytes);
  player.seekToTick(1500);
  const checksumAt1500 = player.sim.calculateChecksum();

  player.seekToTick(2500);
  player.seekToTick(1500); // backward → re-sim from 0
  check('Seek: backward seek reproduces identical state', player.sim.calculateChecksum() === checksumAt1500);

  const preview = player.previewAt(1500);
  check('Seek: keyframe preview available', preview !== null && preview.tick <= 1500);
}

// ── Version gate: future format is rejected with a clear error ────────────
{
  const corrupted = new Uint8Array(bytes);
  corrupted[4] = 99; // bump format version (u16 LE at offset 4)
  corrupted[5] = 0;
  let error: ReplayFormatError | null = null;
  try { decodeReplay(corrupted); } catch (e) { if (e instanceof ReplayFormatError) error = e; }
  check('Version gate: unsupported version rejected with clear message', error?.code === 'VERSION_UNSUPPORTED');
}

// ── Tamper detection: modified command log fails checkpoint verification ──
{
  const data = decodeReplay(bytes);
  const moveFrame = data.frames.find((f) => f.commands.some((c) => c.type === CommandType.MOVE));
  if (moveFrame) {
    const cmd = moveFrame.commands.find((c) => c.type === CommandType.MOVE) as { targetX: number };
    cmd.targetX += 5000; // tamper
    const { encodeReplay } = await import('@ra4/replay');
    const tampered = encodeReplay(data);
    const player = new ReplayPlayerV2(tampered);
    const verification = player.verify();
    check('Tamper detection: modified command log fails verification', !verification.verified,
      `checked ${verification.checkpointsChecked}`);
  } else {
    check('Tamper detection: MOVE frame present in replay', false);
  }
}

if (failures > 0) {
  console.error(`FAILED: ${failures} replay v2 test(s) failed.`);
  process.exit(1);
}
console.log('SUCCESS! All Replay Format v2 Tests passed cleanly.');
