import { decodeEnvelope, encodeEnvelope, WireError, WireKind } from './wire.js';
export class ProtocolChannel {
    opts;
    nextSeq = 1;
    lastInboundSeq = 0;
    lastPeerAck = 0;
    lastInboundAt;
    lastOutboundAt;
    stats = {
        sent: 0, received: 0, duplicatesDropped: 0,
        lastInboundSeq: 0, lastPeerAck: 0, lastInboundAtMs: 0,
    };
    heartbeatIntervalMs;
    peerTimeoutMs;
    constructor(opts) {
        this.opts = opts;
        this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 2000;
        this.peerTimeoutMs = opts.peerTimeoutMs ?? 10000;
        this.lastInboundAt = opts.now();
        this.lastOutboundAt = opts.now();
    }
    send(kind, payload) {
        const seq = this.nextSeq++;
        const frame = encodeEnvelope(kind, seq, this.lastInboundSeq, payload);
        this.opts.sendRaw(frame);
        this.lastOutboundAt = this.opts.now();
        this.stats.sent++;
        return seq;
    }
    onData(data) {
        let envelope;
        try {
            envelope = decodeEnvelope(data);
        }
        catch (error) {
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
        if (envelope.kind === WireKind.HEARTBEAT)
            return; // liveness only
        this.opts.onMessage(envelope);
    }
    /**
     * Host calls this periodically (e.g. once per tick or per second).
     * Sends a heartbeat if the outbound channel has been idle, and returns
     * false when the peer has been silent past the timeout.
     */
    maintain() {
        const now = this.opts.now();
        if (now - this.lastOutboundAt >= this.heartbeatIntervalMs) {
            this.send(WireKind.HEARTBEAT, new Uint8Array(0));
        }
        return now - this.lastInboundAt < this.peerTimeoutMs;
    }
    getStats() {
        return this.stats;
    }
}
//# sourceMappingURL=channel.js.map