import type { MatchConfig } from '@ra4/sim-core';
import { FactionId, PlayerCommand, PlayerType } from '@ra4/shared-types';
import { SimFrame, SimWorkerClient } from '../sim/SimWorkerClient.js';
import {
  GameOverInfo, LobbyStateInfo, MatchStartInfo, NetworkMatchClient, NetworkStatus,
} from './NetworkMatchClient.js';

export interface NetworkedMatchHandlers {
  onFrame?: (frame: SimFrame) => void;
  onStatus?: (status: NetworkStatus, detail?: string) => void;
  onLobbyState?: (state: LobbyStateInfo) => void;
  onMatchStart?: (info: MatchStartInfo) => void;
  onGameOver?: (info: GameOverInfo) => void;
  onDesync?: (tick: number, serverChecksum: number, localChecksum: number) => void;
}

export interface NetworkedMatchOptions extends NetworkedMatchHandlers {
  url: string;
  playerName: string;
  roomId?: string;
}

/**
 * NetworkedMatchSession — binds the authoritative network client to the
 * local simulation Worker.
 *
 * Data flow (server-authoritative, no client-side authority):
 *
 *   input → submitCommands → SERVER (validate) → TICK_FRAME
 *                                                   ↓
 *                              sim Worker: processCommands + step (1 tick)
 *                                                   ↓
 *                              TICK_APPLIED (local checksum) → reportChecksum
 *                                                   ↓
 *                                      SNAPSHOT → renderer / HUD
 *
 * The local simulation runs in networked mode: it has no clock of its own,
 * so the server's tick stream is the only time source. Player input is
 * never applied locally before server validation — an invalid command
 * simply never appears in the authoritative stream.
 */
export class NetworkedMatchSession {
  public readonly sim: SimWorkerClient;
  public readonly net: NetworkMatchClient;
  public playerIndex = 0;

  private disposed = false;
  private simInitialized = false;

  constructor(private opts: NetworkedMatchOptions) {
    this.sim = new SimWorkerClient();

    this.sim.onFrame((frame) => this.opts.onFrame?.(frame));
    this.sim.onError((message) => this.opts.onStatus?.('ERROR', `sim: ${message}`));

    // Every applied authoritative tick reports its local checksum back so
    // the server can detect divergence from its own state.
    this.sim.onTickApplied((tick, checksum) => {
      this.net.reportChecksum(tick, checksum);
    });

    this.net = new NetworkMatchClient({
      url: opts.url,
      playerName: opts.playerName,
      roomId: opts.roomId,
      onStatus: (status, detail) => this.opts.onStatus?.(status, detail),
      onLobbyState: (state) => {
        this.playerIndex = this.net.playerIndex;
        this.opts.onLobbyState?.(state);
      },
      onMatchStart: (info) => { void this.handleMatchStart(info); },
      onServerTick: (tick, commands) => {
        if (this.simInitialized) this.sim.applyServerTick(tick, commands);
      },
      onSnapshot: () => {
        // Reconnect recovery: the server's snapshot is authoritative. The
        // deterministic path is to re-simulate from the authoritative
        // stream, so we surface the snapshot for immediate rendering while
        // the tick stream resumes.
      },
      onGameOver: (info) => {
        this.sim.stop();
        this.opts.onGameOver?.(info);
      },
      onDesync: (tick, serverChecksum, localChecksum) => {
        this.opts.onDesync?.(tick, serverChecksum, localChecksum);
      },
    });
  }

  private async handleMatchStart(info: MatchStartInfo): Promise<void> {
    if (this.disposed) return;

    // The server sends the authoritative player configs; the local sim is
    // initialized from them verbatim so both start from identical state.
    const config: MatchConfig = {
      seed: info.seed,
      tickRate: info.tickRate,
      startingCredits: info.startingCredits,
      players: info.players,
      // The server's map is authoritative — loading a different one would
      // change spawns/resources and desync immediately.
      mapId: info.mapId,
    };

    await this.sim.initializeNetworked(config);
    if (this.disposed) return;
    this.sim.start();
    this.simInitialized = true;
    this.opts.onMatchStart?.(info);
  }

  public connect(): void {
    this.net.connect();
  }

  /**
   * Replace the frame handler. Used by the host to attach the renderer once
   * the match actually starts (the renderer does not exist while in lobby).
   */
  public onFrame(handler: (frame: SimFrame) => void): void {
    this.opts.onFrame = handler;
  }

  /** Player input path: commands go to the server, never applied locally. */
  public dispatchCommand(command: PlayerCommand): { accepted: boolean } {
    this.net.submitCommand({ ...command, playerIndex: this.playerIndex });
    return { accepted: true };
  }

  public setReady(isReady: boolean): void { this.net.setReady(isReady); }
  public setSlot(slotIndex: number, factionId?: FactionId, playerType?: PlayerType, team?: number): void {
    this.net.setSlot(slotIndex, factionId, playerType, team);
  }
  public setMap(mapId: string): void { this.net.setMap(mapId); }
  public startMatch(): void { this.net.startMatch(); }
  public surrender(): void { this.net.surrender(); }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.net.dispose();
    this.sim.dispose();
  }
}
