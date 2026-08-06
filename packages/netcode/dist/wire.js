/**
 * Protocol v1 — binary wire format.
 *
 * Every WebSocket frame is a binary envelope:
 *
 *   offset  size  field
 *   0       2     magic 0xRA (0x52 0x41)
 *   2       1     protocol version (PROTOCOL_VERSION)
 *   3       1     message kind (WireKind)
 *   4       4     sequence number (uint32 LE) — per-sender monotonic
 *   8       4     ack — highest contiguous seq received from the peer
 *   12      4     payload byte length (uint32 LE)
 *   16      n     payload
 *
 * High-frequency payloads (commands, tick frames, checksums, heartbeat)
 * use hand-coded compact binary codecs below. Low-frequency lobby/meta
 * payloads are UTF-8 JSON inside the same envelope — still versioned,
 * still sequenced, cheap to evolve.
 *
 * All integers are little-endian. Coordinates are scaled ints (fit int32).
 */
export const PROTOCOL_VERSION = 1;
export const WIRE_MAGIC_0 = 0x52; // 'R'
export const WIRE_MAGIC_1 = 0x41; // 'A'
export const ENVELOPE_HEADER_SIZE = 16;
/** Hard cap — a frame larger than this is a protocol violation. */
export const MAX_FRAME_BYTES = 512 * 1024;
export var WireKind;
(function (WireKind) {
    // Control
    WireKind[WireKind["HEARTBEAT"] = 1] = "HEARTBEAT";
    WireKind[WireKind["HELLO"] = 2] = "HELLO";
    WireKind[WireKind["HELLO_ACK"] = 3] = "HELLO_ACK";
    WireKind[WireKind["PROTOCOL_ERROR"] = 4] = "PROTOCOL_ERROR";
    // Lobby / meta (JSON payloads)
    WireKind[WireKind["LOBBY_JSON"] = 10] = "LOBBY_JSON";
    // Match-critical (binary payloads)
    WireKind[WireKind["SUBMIT_COMMANDS"] = 20] = "SUBMIT_COMMANDS";
    WireKind[WireKind["TICK_FRAME"] = 21] = "TICK_FRAME";
    WireKind[WireKind["CHECKSUM_REPORT"] = 22] = "CHECKSUM_REPORT";
    WireKind[WireKind["CHECKSUM_STATE"] = 23] = "CHECKSUM_STATE";
    WireKind[WireKind["SNAPSHOT_JSON"] = 24] = "SNAPSHOT_JSON";
    WireKind[WireKind["MATCH_START_JSON"] = 25] = "MATCH_START_JSON";
    WireKind[WireKind["GAME_OVER_JSON"] = 26] = "GAME_OVER_JSON";
})(WireKind || (WireKind = {}));
export class WireError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'WireError';
    }
}
export function encodeEnvelope(kind, seq, ack, payload) {
    if (payload.byteLength + ENVELOPE_HEADER_SIZE > MAX_FRAME_BYTES) {
        throw new WireError('FRAME_TOO_LARGE', `frame ${payload.byteLength + ENVELOPE_HEADER_SIZE} bytes exceeds ${MAX_FRAME_BYTES}`);
    }
    const buf = new Uint8Array(ENVELOPE_HEADER_SIZE + payload.byteLength);
    const view = new DataView(buf.buffer);
    buf[0] = WIRE_MAGIC_0;
    buf[1] = WIRE_MAGIC_1;
    buf[2] = PROTOCOL_VERSION;
    buf[3] = kind;
    view.setUint32(4, seq >>> 0, true);
    view.setUint32(8, ack >>> 0, true);
    view.setUint32(12, payload.byteLength, true);
    buf.set(payload, ENVELOPE_HEADER_SIZE);
    return buf;
}
export function decodeEnvelope(data) {
    if (data.byteLength < ENVELOPE_HEADER_SIZE) {
        throw new WireError('FRAME_TRUNCATED', `frame ${data.byteLength} bytes < header ${ENVELOPE_HEADER_SIZE}`);
    }
    if (data.byteLength > MAX_FRAME_BYTES) {
        throw new WireError('FRAME_TOO_LARGE', `frame ${data.byteLength} bytes exceeds ${MAX_FRAME_BYTES}`);
    }
    if (data[0] !== WIRE_MAGIC_0 || data[1] !== WIRE_MAGIC_1) {
        throw new WireError('BAD_MAGIC', 'not a RA4 protocol frame');
    }
    const version = data[2];
    if (version !== PROTOCOL_VERSION) {
        throw new WireError('VERSION_MISMATCH', `peer protocol v${version}, local v${PROTOCOL_VERSION}`);
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const kind = data[3];
    const seq = view.getUint32(4, true);
    const ack = view.getUint32(8, true);
    const len = view.getUint32(12, true);
    if (ENVELOPE_HEADER_SIZE + len !== data.byteLength) {
        throw new WireError('LENGTH_MISMATCH', `declared payload ${len}, actual ${data.byteLength - ENVELOPE_HEADER_SIZE}`);
    }
    return { version, kind, seq, ack, payload: data.subarray(ENVELOPE_HEADER_SIZE) };
}
// ── JSON payload helpers (lobby / rare messages) ─────────────────────────
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
export function encodeJsonPayload(value) {
    return textEncoder.encode(JSON.stringify(value));
}
export function decodeJsonPayload(payload) {
    return JSON.parse(textDecoder.decode(payload));
}
// ── Binary writer/reader ─────────────────────────────────────────────────
export class BinWriter {
    buf;
    view;
    pos = 0;
    constructor(initial = 256) {
        this.buf = new Uint8Array(initial);
        this.view = new DataView(this.buf.buffer);
    }
    ensure(n) {
        if (this.pos + n <= this.buf.byteLength)
            return;
        const next = new Uint8Array(Math.max(this.buf.byteLength * 2, this.pos + n));
        next.set(this.buf);
        this.buf = next;
        this.view = new DataView(this.buf.buffer);
    }
    u8(v) { this.ensure(1); this.view.setUint8(this.pos, v); this.pos += 1; }
    u16(v) { this.ensure(2); this.view.setUint16(this.pos, v, true); this.pos += 2; }
    u32(v) { this.ensure(4); this.view.setUint32(this.pos, v >>> 0, true); this.pos += 4; }
    i32(v) { this.ensure(4); this.view.setInt32(this.pos, v | 0, true); this.pos += 4; }
    str(s) {
        const bytes = textEncoder.encode(s);
        if (bytes.byteLength > 0xffff)
            throw new WireError('STRING_TOO_LONG', `string ${bytes.byteLength} bytes`);
        this.u16(bytes.byteLength);
        this.ensure(bytes.byteLength);
        this.buf.set(bytes, this.pos);
        this.pos += bytes.byteLength;
    }
    finish() {
        return this.buf.slice(0, this.pos);
    }
}
export class BinReader {
    data;
    view;
    pos = 0;
    constructor(data) {
        this.data = data;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    need(n) {
        if (this.pos + n > this.data.byteLength) {
            throw new WireError('PAYLOAD_TRUNCATED', `need ${n} bytes at ${this.pos}, have ${this.data.byteLength}`);
        }
    }
    u8() { this.need(1); const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
    u16() { this.need(2); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
    u32() { this.need(4); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
    i32() { this.need(4); const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }
    str() {
        const len = this.u16();
        this.need(len);
        const s = textDecoder.decode(this.data.subarray(this.pos, this.pos + len));
        this.pos += len;
        return s;
    }
    get remaining() { return this.data.byteLength - this.pos; }
}
//# sourceMappingURL=wire.js.map