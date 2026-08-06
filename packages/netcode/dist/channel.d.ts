import { Envelope, WireError, WireKind } from './wire.js';
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
export declare class ProtocolChannel {
    private opts;
    private nextSeq;
    private lastInboundSeq;
    private lastPeerAck;
    private lastInboundAt;
    private lastOutboundAt;
    private stats;
    private readonly heartbeatIntervalMs;
    private readonly peerTimeoutMs;
    constructor(opts: ChannelOptions);
    send(kind: WireKind, payload: Uint8Array): number;
    onData(data: Uint8Array): void;
    /**
     * Host calls this periodically (e.g. once per tick or per second).
     * Sends a heartbeat if the outbound channel has been idle, and returns
     * false when the peer has been silent past the timeout.
     */
    maintain(): boolean;
    getStats(): Readonly<ChannelStats>;
}
//# sourceMappingURL=channel.d.ts.map