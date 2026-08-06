import { decodeEnvelope, encodeEnvelope, Envelope, WireError, WireKind } from './wire.js';

/**
 * ProtocolChannel — transport-agnostic sequencing layer for Protocol v1.
 *
 * Responsibilities:
 *  - assigns monotonic sequence numbers to outbound frames;
 *  - tracks the highest contiguous inbound seq (for ack piggybacking);
 *  - drops duplicate/replayed frames (seq <= last delivered);
 *  - emits heartbeats when idle and detects peer timeout;
 *  - surfaces protocol violations without crashing the host.
 *
 * The channel does not own the socket: the host supplies `sendRaw` and
 * feeds inbound bytes into `onData`, so the same class runs over browser
 * WebSocket, Node `ws`, or an in-memory loopback in tests.
 *
 * Time is injected (`now()`), never read from the wall clock internally,
 * so tests are deterministic.
 */

export interface ChannelOptions {
  sendRaw: (frame: Uint8Array) => void;
  onMessage: (envelope: Envelope) => void;
  onProtocolError?: (error: WireError) => void;
  /** Injected clock (ms). Host supplies performance.now / Date.now. */
  now: () => number;
  heartbeatIntervalMs?: number;
  peerTimeoutMs?: number;
}

export interface ChannelStats {
  sent: number;
  received: number;
  duplicatesDropped: number;
  lastInboundSeq: number;
  lastPeerAck: number;
  lastInboundAtMs: number;
}

export class ProtocolChannel {
  private nextSeq = 1;
  private lastInboundSeq = 0;
  private lastPeerAck = 0;
  private lastInboundAt: number;
  private lastOutboundAt: number;
  private stats: ChannelStats = {
    sent: 0, received: 0, duplicatesDropped: 0,
    lastInboundSeq: 0, lastPeerAck: 0, lastInboundAtMs: 0,
  };

  private readonly heartbeatIntervalMs: number;
  private readonly peerTimeoutMs: number;

  constructor(private opts: ChannelOptions) {
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 2000;
    this.peerTimeoutMs = opts.peerTimeoutMs ?? 10000;
    this.lastInboundAt = opts.now();
    this.lastOutboundAt = opts.now();
  }

  public send(kind: WireKind, payload: Uint8Array): number {
    const seq = this.nextSeq++;
    const frame = encodeEnvelope(kind, seq, this.lastInboundSeq, payload);
    this.opts.sendRaw(frame);
    this.lastOutboundAt = this.opts.now();
    this.stats.sent++;
    return seq;
  }

  public onData(data: Uint8Array): void {
    let envelope: Envelope;
    try {
      envelope = decodeEnvelope(data);
    } catch (error) {
      if (error instanceof WireError) {
        this.opts.onProtocolError?.(error);
        return;
      }
      throw error;
    }

    this.lastInboundAt = this.opts.now();
    this.stats.lastInboundAtMs = this.lastInboundAt;
    this.lastPeerAck = Math.max(this.lastPeerAck, envelope.ack);
    this.stats.lastPeerAck = this.lastPeerAck;

    // Replay/duplicate protection: only strictly newer frames are delivered.
    if (envelope.seq <= this.lastInboundSeq) {
      this.stats.duplicatesDropped++;
      return;
    }
    this.lastInboundSeq = envelope.seq;
    this.stats.lastInboundSeq = envelope.seq;
    this.stats.received++;

    if (envelope.kind === WireKind.HEARTBEAT) return; // liveness only
    this.opts.onMessage(envelope);
  }

  /**
   * Host calls this periodically (e.g. once per tick or per second).
   * Sends a heartbeat if the outbound channel has been idle, and returns
   * false when the peer has been silent past the timeout.
   */
  public maintain(): boolean {
    const now = this.opts.now();
    if (now - this.lastOutboundAt >= this.heartbeatIntervalMs) {
      this.send(WireKind.HEARTBEAT, new Uint8Array(0));
    }
    return now - this.lastInboundAt < this.peerTimeoutMs;
  }

  public getStats(): Readonly<ChannelStats> {
    return this.stats;
  }
}
