import { describe, it, expect, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { AuthoritativeMatchRuntime, MatchPlayerSession } from '../matches/matchRuntime.js';
import { decodeReplay, ReplayPlayerV2 } from '@ra4/replay';
import { CommandType, FactionId, PlayerCommand, PlayerType } from '@ra4/shared-types';

/**
 * Replay download + playback verification (acceptance criterion #42, 21–22:
 * "open the replay" and "reproduce the replay with the same outcome").
 *
 * A real match is played to completion on the authoritative runtime, its
 * replay is served over the same HTTP contract the game server exposes,
 * downloaded as bytes, and then re-simulated headlessly. The replay must
 * reproduce the identical final checksum and the identical winner.
 */

function makePlayer(index: number, faction: FactionId, team: number): MatchPlayerSession {
  return {
    playerIndex: index,
    name: `P${index}`,
    factionId: faction,
    team,
    type: PlayerType.HUMAN,
    ws: null,
    isConnected: true,
    lastAckTick: 0,
    reconnectToken: `token-${index}`,
  };
}

describe('Replay download and playback', () => {
  let app: FastifyInstance | null = null;
  let runtime: AuthoritativeMatchRuntime | null = null;

  afterEach(async () => {
    runtime?.stop();
    runtime = null;
    await app?.close();
    app = null;
  });

  it('serves a finished match replay over HTTP that reproduces the identical outcome', async () => {
    // ── Play a real match to completion ───────────────────────────────────
    runtime = new AuthoritativeMatchRuntime('map_iron_crossroads', [
      makePlayer(0, FactionId.USSR, 0),
      makePlayer(1, FactionId.ALLIANCE, 1),
    ], 606001);
    const rt = runtime;

    const stored = new Map<string, Buffer>();
    rt.onFinished = (finished) => { stored.set(finished.matchId, Buffer.from(finished.exportReplay())); };

    // A couple of real commands so the log is not empty.
    const script = new Map<number, { player: number; cmd: PlayerCommand }[]>([
      [20, [{ player: 0, cmd: { type: CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 20, gridY: 12, entityIds: [], playerIndex: 0, tick: 20 } }]],
      [40, [{ player: 1, cmd: { type: CommandType.BUILD_STRUCTURE, structureId: 'AL_FissionReactor', gridX: 76, gridY: 84, entityIds: [], playerIndex: 1, tick: 40 } }]],
    ]);

    for (let t = 1; t <= 400; t++) {
      for (const entry of script.get(t) ?? []) {
        const res = rt.submitCommand(entry.player, entry.cmd);
        expect(res.valid, `tick ${t}: ${res.reason}`).toBe(true);
      }
      (rt as unknown as { tick: () => void }).tick();
    }

    // End the match through a real, recordable command: player 1 surrenders.
    // (Directly zeroing HP would be an out-of-band mutation that no command
    // log can reproduce — the replay would legitimately diverge.)
    const surrender: PlayerCommand = { type: CommandType.SURRENDER, entityIds: [], playerIndex: 1, tick: 400 };
    expect(rt.submitCommand(1, surrender).valid).toBe(true);
    for (let t = 0; t < 20 && stored.size === 0; t++) {
      (rt as unknown as { tick: () => void }).tick();
    }

    const liveChecksum = rt.sim.calculateChecksum();
    const liveWinner = rt.sim.winnerTeam;
    const liveTicks = rt.sim.tickIndex;
    expect(liveWinner, 'match produced a winner').toBe(0);
    expect(stored.size, 'onFinished archived the replay').toBe(1);

    // ── Serve it over the same HTTP contract as the game server ───────────
    app = Fastify({ logger: false });
    app.get('/api/v1/replays', async () => ({
      replays: Array.from(stored.entries()).map(([matchId, bytes]) => ({ matchId, sizeBytes: bytes.byteLength })),
    }));
    app.get('/api/v1/replays/:matchId', async (req, reply) => {
      const { matchId } = req.params as { matchId: string };
      const bytes = stored.get(matchId);
      if (!bytes) { reply.status(404); return { error: 'not found' }; }
      reply.type('application/octet-stream').header('X-RA4-Replay-Format', '2');
      return bytes;
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    // Listing must show the finished match.
    const listRes = await fetch(`http://127.0.0.1:${port}/api/v1/replays`);
    expect(listRes.ok).toBe(true);
    const list = await listRes.json() as { replays: { matchId: string; sizeBytes: number }[] };
    expect(list.replays).toHaveLength(1);
    expect(list.replays[0].sizeBytes).toBeGreaterThan(100);

    // Unknown id must 404 rather than serve garbage.
    const missing = await fetch(`http://127.0.0.1:${port}/api/v1/replays/does-not-exist`);
    expect(missing.status).toBe(404);

    // ── Download the exact bytes ──────────────────────────────────────────
    const dlRes = await fetch(`http://127.0.0.1:${port}/api/v1/replays/${rt.matchId}`);
    expect(dlRes.ok).toBe(true);
    expect(dlRes.headers.get('x-ra4-replay-format')).toBe('2');
    const downloaded = new Uint8Array(await dlRes.arrayBuffer());
    expect(downloaded.byteLength).toBe(stored.get(rt.matchId)!.byteLength);

    // Header must describe the match that was actually played.
    const decoded = decodeReplay(downloaded);
    expect(decoded.header.seed).toBe(606001);
    expect(decoded.header.mapId).toBe('map_iron_crossroads');
    expect(decoded.header.result?.winnerTeam).toBe(liveWinner);
    expect(decoded.header.players).toHaveLength(2);

    // ── Replay it: identical outcome, checkpoint-verified ─────────────────
    const player = new ReplayPlayerV2(downloaded);
    const verification = player.verify();
    expect(verification.verified, `divergence at tick ${verification.firstDivergenceTick}`).toBe(true);
    expect(verification.checkpointsChecked).toBeGreaterThan(0);
    expect(player.sim.calculateChecksum(), 'replay final checksum').toBe(liveChecksum);
    expect(player.sim.winnerTeam, 'replay winner').toBe(liveWinner);
    expect(player.currentTick, 'replay duration').toBe(liveTicks);

    // Seeking mid-replay and replaying forward must stay exact.
    const half = Math.floor(liveTicks / 2);
    player.seekToTick(half);
    const midChecksum = player.sim.calculateChecksum();
    player.seekToTick(liveTicks);
    expect(player.sim.calculateChecksum()).toBe(liveChecksum);
    player.seekToTick(half);
    expect(player.sim.calculateChecksum(), 'seek is reproducible').toBe(midChecksum);
  }, 30000);
});
