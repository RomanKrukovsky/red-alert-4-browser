import {
  decodeChecksum, decodeEnvelope, decodeJsonPayload, decodeTickFrame,
  encodeChecksum, encodeCommandList, encodeJsonPayload, ProtocolChannel,
  WireError, WireKind,
} from '@ra4/netcode';
import { FactionId, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';

export type NetworkStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'IN_LOBBY'
  | 'IN_MATCH'
  | 'RECONNECTING'
  | 'MATCH_OVER'
  | 'ERROR';

export interface MatchStartInfo {
  matchId: string;
  seed: number;
  tickRate: number;
  mapId: string;
  /** Authoritative player configs in slot order — used verbatim for local init. */
  players: { name: string; factionId: FactionId; type: PlayerType; team: number }[];
  startingCredits: number;
  initialSnapshot: WorldSnapshot;
}

export interface GameOverInfo {
  winnerTeam: number;
  winningPlayerIndices: number[];
  reason: string;
  finalChecksum: number;
  desyncEvents: number;
}

export interface LobbySlotInfo {
  index: number;
  name: string;
  factionId: FactionId;
  type: PlayerType;
  team: number;
  isReady: boolean;
  isConnected: boolean;
}

export interface LobbyStateInfo {
  roomId: string;
  mapId: string;
  hostIndex: number;
  slots: LobbySlotInfo[];
}

export interface NetworkClientHandlers {
  onStatus?: (status: NetworkStatus, detail?: string) => void;
  onLobbyState?: (state: LobbyStateInfo) => void;
  onMatchStart?: (info: MatchStartInfo) => void;
  /** Authoritative tick: apply these validated commands, then step once. */
  onServerTick?: (tick: number, commands: PlayerCommand[]) => void;
  /** Server's authoritative checksum for a tick — compare with local. */
  onServerChecksum?: (tick: number, checksum: number) => void;
  /** Full state restore (initial join or reconnect recovery). */
  onSnapshot?: (snapshot: WorldSnapshot) => void;
  onGameOver?: (info: GameOverInfo) => void;
  onDesync?: (tick: number, serverChecksum: number, localChecksum: number) => void;
}

export interface NetworkClientOptions extends NetworkClientHandlers {
  url: string;
  playerName: string;
  roomId?: string;
  /** Reconnect backoff schedule (ms). Total must cover the 90 s window. */
  reconnectDelaysMs?: number[];
}

/**
 * Browser multiplayer client (Protocol v1).
 *
 * The server is authoritative: this client sends commands, receives the
 * validated command stream in binary TICK_FRAMEs, and feeds them to the
 * local simulation Worker which re-simulates deterministically. It also
 * compares the server's periodic checksums against locally computed ones
 * and reports its own checksum back for server-side desync detection.
 *
 * Reconnect: on socket loss the client retries with a bounded backoff
 * schedule covering the server's 90 s reconnect window, then restores
 * state from the snapshot the server sends on successful resume.
 */
export class NetworkMatchClient {
  public status: NetworkStatus = 'DISCONNECTED';
  public playerIndex = 0;
  public lastServerTick = 0;
  /** Local checksums by tick, pending comparison with the server's. */
  private localChecksums = new Map<number, number>();
  private desyncDetected = false;

  private socket: WebSocket | null = null;
  private channel: ProtocolChannel | null = null;
  private maintainTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private disposed = false;
  private matchStarted = false;
  private readonly reconnectDelays: number[];

  constructor(private opts: NetworkClientOptions) {
    this.reconnectDelays = opts.reconnectDelaysMs ?? [500, 1000, 2000, 4000, 8000, 15000, 30000];
  }

  public get isDesynced(): boolean {
    return this.desyncDetected;
  }

  public connect(): void {
    if (this.disposed) return;
    this.setStatus(this.matchStarted ? 'RECONNECTING' : 'CONNECTING');

    const socket = new WebSocket(this.opts.url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    this.channel = new ProtocolChannel({
      sendRaw: (frame) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(frame);
      },
      onMessage: (envelope) => this.handleEnvelope(envelope.kind, envelope.payload),
      onProtocolError: (error: WireError) => {
        console.error('[Net] protocol error', error.code, error.message);
        this.setStatus('ERROR', `${error.code}: ${error.message}`);
      },
      now: () => performance.now(),
    });

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      if (this.matchStarted) {
        // Resume an in-progress match; server validates the token + window.
        this.sendJson({
          type: 'RECONNECT',
          roomId: this.opts.roomId ?? 'default-room',
          playerIndex: this.playerIndex,
          lastTick: this.lastServerTick,
        });
        this.setStatus('IN_MATCH');
      } else {
        this.sendJson({ type: 'JOIN_LOBBY', playerName: this.opts.playerName, roomId: this.opts.roomId });
      }
      this.startMaintain();
    };

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        this.handleJsonMessage(event.data);
        return;
      }
      this.channel?.onData(new Uint8Array(event.data as ArrayBuffer));
    };

    socket.onclose = () => {
      this.stopMaintain();
      if (this.disposed || this.status === 'MATCH_OVER') return;
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // 'close' follows; reconnect logic lives there.
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.reconnectDelays.length) {
      this.setStatus('DISCONNECTED', 'Reconnect window exhausted');
      return;
    }
    const delay = this.reconnectDelays[this.reconnectAttempt++];
    this.setStatus('RECONNECTING', `Повторное подключение через ${Math.round(delay / 1000)} с`);
    setTimeout(() => {
      if (!this.disposed) this.connect();
    }, delay);
  }

  private startMaintain(): void {
    this.stopMaintain();
    // Heartbeat + peer liveness check once per second.
    this.maintainTimer = setInterval(() => {
      const alive = this.channel?.maintain() ?? false;
      if (!alive && this.status === 'IN_MATCH') {
        console.warn('[Net] peer timeout — forcing reconnect');
        this.socket?.close();
      }
    }, 1000);
  }

  private stopMaintain(): void {
    if (this.maintainTimer !== null) {
      clearInterval(this.maintainTimer);
      this.maintainTimer = null;
    }
  }

  // ── Outbound ───────────────────────────────────────────────────────────

  /** Send player commands to the server for validation (binary frame). */
  public submitCommands(commands: PlayerCommand[]): void {
    if (!this.channel || commands.length === 0) return;
    this.channel.send(WireKind.SUBMIT_COMMANDS, encodeCommandList(commands));
  }

  public submitCommand(command: PlayerCommand): void {
    this.submitCommands([command]);
  }

  /** Report a locally computed checksum for a tick (desync detection). */
  public reportChecksum(tick: number, checksum: number): void {
    this.localChecksums.set(tick, checksum);
    // Bound the map: only recent ticks matter for comparison.
    if (this.localChecksums.size > 600) {
      const oldest = Math.min(...this.localChecksums.keys());
      this.localChecksums.delete(oldest);
    }
    this.channel?.send(WireKind.CHECKSUM_REPORT, encodeChecksum({ tick, checksum }));
  }

  public setReady(isReady: boolean): void {
    this.sendJson({ type: 'SET_READY', isReady });
  }

  public setSlot(slotIndex: number, factionId?: FactionId, playerType?: PlayerType, team?: number): void {
    this.sendJson({ type: 'SET_SLOT', slotIndex, factionId, playerType, team });
  }

  public setMap(mapId: string): void {
    this.sendJson({ type: 'SET_MAP', mapId });
  }

  public startMatch(): void {
    this.sendJson({ type: 'START_MATCH' });
  }

  public surrender(): void {
    this.submitCommand({
      type: 'SURRENDER' as PlayerCommand['type'],
      entityIds: [],
      playerIndex: this.playerIndex,
      tick: this.lastServerTick,
    } as PlayerCommand);
  }

  private sendJson(value: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(value));
    }
  }

  // ── Inbound ────────────────────────────────────────────────────────────

  private handleEnvelope(kind: WireKind, payload: Uint8Array): void {
    switch (kind) {
      case WireKind.TICK_FRAME: {
        const frame = decodeTickFrame(payload);
        this.lastServerTick = frame.tick;
        this.opts.onServerTick?.(frame.tick, frame.commands);
        break;
      }
      case WireKind.CHECKSUM_STATE: {
        const { tick, checksum } = decodeChecksum(payload);
        this.opts.onServerChecksum?.(tick, checksum);
        const local = this.localChecksums.get(tick);
        if (local !== undefined && local !== checksum) {
          this.desyncDetected = true;
          console.error(`[Net] DESYNC at tick ${tick}: local=${local} server=${checksum}`);
          this.opts.onDesync?.(tick, checksum, local);
        }
        break;
      }
      case WireKind.MATCH_START_JSON: {
        const info = decodeJsonPayload<MatchStartInfo>(payload);
        this.matchStarted = true;
        this.setStatus('IN_MATCH');
        this.opts.onMatchStart?.(info);
        break;
      }
      case WireKind.SNAPSHOT_JSON: {
        const { snapshot } = decodeJsonPayload<{ snapshot: WorldSnapshot }>(payload);
        this.lastServerTick = snapshot.tick;
        this.opts.onSnapshot?.(snapshot);
        break;
      }
      case WireKind.GAME_OVER_JSON: {
        const info = decodeJsonPayload<GameOverInfo>(payload);
        this.setStatus('MATCH_OVER');
        this.opts.onGameOver?.(info);
        break;
      }
      case WireKind.LOBBY_JSON: {
        const state = decodeJsonPayload<LobbyStateInfo>(payload);
        this.setStatus('IN_LOBBY');
        this.opts.onLobbyState?.(state);
        break;
      }
      case WireKind.PROTOCOL_ERROR: {
        const err = decodeJsonPayload<{ code: string; message: string }>(payload);
        this.setStatus('ERROR', `${err.code}: ${err.message}`);
        break;
      }
      default:
        break;
    }
  }

  /** Legacy JSON lobby/meta messages (pre-binary lobby path). */
  private handleJsonMessage(data: string): void {
    try {
      const msg = JSON.parse(data) as { type: string; [k: string]: unknown };
      switch (msg.type) {
        case 'LOBBY_STATE': {
          const state = msg.state as LobbyStateInfo & { slots: LobbySlotInfo[] };
          // Identify our own slot by name on first lobby state.
          const own = state.slots?.find((s) => s.name === this.opts.playerName);
          if (own) this.playerIndex = own.index;
          this.setStatus('IN_LOBBY');
          this.opts.onLobbyState?.(state);
          break;
        }
        case 'ERROR':
          this.setStatus('ERROR', String(msg.message ?? 'server error'));
          break;
        default:
          break;
      }
    } catch {
      console.warn('[Net] unparseable JSON message');
    }
  }

  private setStatus(status: NetworkStatus, detail?: string): void {
    if (this.status === status && !detail) return;
    this.status = status;
    this.opts.onStatus?.(status, detail);
  }

  public dispose(): void {
    this.disposed = true;
    this.stopMaintain();
    this.localChecksums.clear();
    const socket = this.socket;
    this.socket = null;
    this.channel = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
  }
}

export { encodeJsonPayload, decodeEnvelope };
