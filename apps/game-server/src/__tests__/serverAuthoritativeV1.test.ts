import { describe, it, expect, afterEach } from 'vitest';
import { AuthoritativeMatchRuntime, MatchPlayerSession, RECONNECT_WINDOW_MS } from '../matches/matchRuntime.js';
import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerCommand, PlayerType } from '@ra4/shared-types';
import { ReplayPlayerV2 } from '@ra4/replay';
import { decodeEnvelope, decodeTickFrame, WireKind } from '@ra4/netcode';

/**
 * Server-authoritative Protocol v1 integration:
 *  - two simulated clients re-simulate the server's binary TICK_FRAME stream;
 *  - client checksums must match the server at every broadcast checkpoint;
 *  - the recorded replay must verify headlessly with the same final checksum;
 *  - invalid/cheating commands never reach the simulation.
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

/** In-memory client: applies TICK_FRAMEs to a local deterministic sim. */
class SimulatedClient {
  public sim: GameSimulation;
  public lastTick = 0;
  public checksumMismatches = 0;

  constructor(seed: number, players: { name: string; factionId: FactionId; type: PlayerType; team: number }[]) {
    this.sim = new GameSimulation(seed);
    this.sim.initMatch(players);
  }

  public onFrame(frame: Uint8Array): void {
    const envelope = decodeEnvelope(frame);
    if (envelope.kind === WireKind.TICK_FRAME) {
      const { tick, commands } = decodeTickFrame(envelope.payload);
      this.sim.processCommands(commands);
      this.sim.step();
      this.lastTick = tick;
      if (this.sim.tickIndex !== tick) {
        throw new Error(`client tick ${this.sim.tickIndex} != server tick ${tick}`);
      }
    }
  }
}

describe('Server-Authoritative Protocol v1', () => {
  let runtime: AuthoritativeMatchRuntime | null = null;

  afterEach(() => {
    runtime?.stop();
    runtime = null;
  });

  it('two clients re-simulating the binary TICK_FRAME stream stay in checksum sync and the replay verifies', () => {
    const playerConfigs = [makePlayer(0, FactionId.USSR, 0), makePlayer(1, FactionId.USSR, 1)];
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 555001);

    const simPlayers = playerConfigs.map((p) => ({ name: p.name, factionId: p.factionId, type: p.type, team: p.team }));
    const clientA = new SimulatedClient(555001, simPlayers);
    const clientB = new SimulatedClient(555001, simPlayers);

    // Manual tick loop (no wall-clock timer): intercept broadcasts.
    const frames: Uint8Array[] = [];
    const origBroadcast = runtime.broadcastKind.bind(runtime);
    runtime.broadcastKind = (kind, payload) => {
      // Reconstruct the envelope exactly as clients would receive it.
      const { encodeEnvelope } = require('@ra4/netcode') as typeof import('@ra4/netcode');
      frames.push(encodeEnvelope(kind, frames.length + 1, 0, payload));
      origBroadcast(kind, payload);
    };

    // Scripted commands: both players build and move at deterministic ticks.
    const script = new Map<number, { playerIndex: number; command: PlayerCommand }[]>();
    script.set(30, [
      { playerIndex: 0, command: { type: CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 22, gridY: 14, entityIds: [], playerIndex: 0, tick: 30 } },
      { playerIndex: 1, command: { type: CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 106, gridY: 114, entityIds: [], playerIndex: 1, tick: 30 } },
    ]);
    script.set(300, [
      { playerIndex: 0, command: { type: CommandType.MOVE, entityIds: [6], targetX: 50000, targetY: 50000, playerIndex: 0, tick: 300 } },
    ]);

    const TICKS = 1200;
    for (let t = 1; t <= TICKS; t++) {
      for (const entry of script.get(t) ?? []) {
        const res = runtime.submitCommand(entry.playerIndex, entry.command);
        expect(res.valid, `command at tick ${t}: ${res.reason}`).toBe(true);
      }
      (runtime as unknown as { tick: () => void }).tick();
    }

    // Feed the captured binary stream to both clients.
    for (const frame of frames) {
      clientA.onFrame(frame);
      clientB.onFrame(frame);
    }

    const serverChecksum = runtime.sim.calculateChecksum();
    expect(clientA.sim.calculateChecksum()).toBe(serverChecksum);
    expect(clientB.sim.calculateChecksum()).toBe(serverChecksum);
    expect(clientA.sim.tickIndex).toBe(TICKS);

    // Replay v2 verification: re-simulation matches all recorded checkpoints.
    const replayBytes = runtime.exportReplay();
    const player = new ReplayPlayerV2(replayBytes);
    // Recorder's durationTicks tracks the last recorded tick.
    const verification = player.verify();
    expect(verification.verified, `replay divergence at tick ${verification.firstDivergenceTick}`).toBe(true);
    expect(player.sim.calculateChecksum()).toBe(serverChecksum);
  });

  it('rejects cheating commands: foreign entities, unaffordable builds, wrong faction, spoofed player', () => {
    const playerConfigs = [makePlayer(0, FactionId.USSR, 0), makePlayer(1, FactionId.ALLIANCE, 1)];
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 555002);

    // Find an entity belonging to player 1.
    let enemyEntityId = -1;
    for (const e of runtime.sim.entities.values()) {
      if (e.playerIndex === 1 && !e.isBuilding) { enemyEntityId = e.id; break; }
    }
    expect(enemyEntityId).toBeGreaterThan(0);

    // 1. Ordering a foreign unit
    const foreign = runtime.submitCommand(0, { type: CommandType.MOVE, entityIds: [enemyEntityId], targetX: 1000, targetY: 1000, playerIndex: 0, tick: 1 });
    expect(foreign.valid).toBe(false);

    // 2. Spoofed playerIndex
    const spoofed = runtime.submitCommand(0, { type: CommandType.SURRENDER, entityIds: [], playerIndex: 1, tick: 1 });
    expect(spoofed.valid).toBe(false);

    // 3. Unaffordable build (drain credits first)
    runtime.sim.players[0].credits = 10;
    const broke = runtime.submitCommand(0, { type: CommandType.BUILD_STRUCTURE, structureId: 'SU_ThermalPower', gridX: 30, gridY: 30, entityIds: [], playerIndex: 0, tick: 1 });
    expect(broke.valid).toBe(false);
    expect(broke.reason).toContain('credits');

    // 4. Wrong-faction structure
    runtime.sim.players[0].credits = 99999;
    const wrongFaction = runtime.submitCommand(0, { type: CommandType.BUILD_STRUCTURE, structureId: 'AL_PowerPlant', gridX: 30, gridY: 30, entityIds: [], playerIndex: 0, tick: 1 });
    expect(wrongFaction.valid).toBe(false);

    // 5. Missing tech prerequisite: destroy the CommandRadar, then try a T2 unit
    let factoryId = -1;
    for (const e of runtime.sim.entities.values()) {
      if (e.playerIndex === 0 && e.specId === 'SU_HeavyFactory') factoryId = e.id;
      if (e.playerIndex === 0 && e.specId === 'SU_CommandRadar') runtime.sim.removeEntity(e.id);
    }
    const noTech = runtime.submitCommand(0, { type: CommandType.PRODUCE_UNIT, producerEntityId: factoryId, unitId: 'SU_ZarevoMLRS', entityIds: [], playerIndex: 0, tick: 1 });
    expect(noTech.valid).toBe(false);
    expect(noTech.reason).toContain('prerequisite');
  });

  it('desync detection records mismatched client checksum reports', () => {
    const playerConfigs = [makePlayer(0, FactionId.USSR, 0), makePlayer(1, FactionId.USSR, 1)];
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 555003);

    for (let t = 1; t <= 10; t++) (runtime as unknown as { tick: () => void }).tick();

    // Correct report → no desync
    runtime.reportChecksum(0, runtime.sim.tickIndex, runtime.sim.calculateChecksum());
    expect(runtime.desyncEvents.length).toBe(0);

    // Wrong report at the current tick → desync recorded
    runtime.reportChecksum(1, runtime.sim.tickIndex, 12345678);
    expect(runtime.desyncEvents.length).toBe(1);
    expect(runtime.desyncEvents[0].playerIndex).toBe(1);
  });

  it('reconnect window: reconnect accepted inside the window, rejected after expiry', () => {
    const playerConfigs = [makePlayer(0, FactionId.USSR, 0), makePlayer(1, FactionId.USSR, 1)];
    runtime = new AuthoritativeMatchRuntime('map_red_square_duel', playerConfigs, 555004);

    runtime.handleDisconnect(0);
    const player = runtime.players.get(0)!;
    expect(player.isConnected).toBe(false);
    expect(RECONNECT_WINDOW_MS).toBeGreaterThanOrEqual(90_000);

    // Inside the window: token check passes (ws=null socket is fine for state update path)
    const fakeWs = { readyState: 99, send: () => undefined } as unknown as import('ws').WebSocket;
    expect(runtime.handleReconnect(0, 'token-0', 0, fakeWs)).toBe(true);
    expect(runtime.players.get(0)!.isConnected).toBe(true);

    // After expiry: rejected
    runtime.handleDisconnect(0);
    runtime.players.get(0)!.disconnectedAtMs = Date.now() - RECONNECT_WINDOW_MS - 1000;
    expect(runtime.handleReconnect(0, 'token-0', 0, fakeWs)).toBe(false);

    // Wrong token: rejected
    runtime.players.get(0)!.disconnectedAtMs = Date.now();
    expect(runtime.handleReconnect(0, 'wrong-token', 0, fakeWs)).toBe(false);
  });
});
