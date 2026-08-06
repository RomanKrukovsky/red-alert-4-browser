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

export enum WireKind {
  // Control
  HEARTBEAT = 1,
  HELLO = 2,          // JSON: version negotiation + auth token
  HELLO_ACK = 3,      // JSON: assigned playerIndex, roomId
  PROTOCOL_ERROR = 4, // JSON: { code, message }

  // Lobby / meta (JSON payloads)
  LOBBY_JSON = 10,

  // Match-critical (binary payloads)
  SUBMIT_COMMANDS = 20, // client → server: PlayerCommand[]
  TICK_FRAME = 21,      // server → client: tick + validated PlayerCommand[]
  CHECKSUM_REPORT = 22, // client → server: tick + checksum
  CHECKSUM_STATE = 23,  // server → client: tick + authoritative checksum
  SNAPSHOT_JSON = 24,   // server → client: full WorldSnapshot (JSON, rare: join/reconnect)
  MATCH_START_JSON = 25,
  GAME_OVER_JSON = 26,
}

export interface Envelope {
  version: number;
  kind: WireKind;
  seq: number;
  ack: number;
  payload: Uint8Array;
}

export class WireError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'WireError';
  }
}

export function encodeEnvelope(kind: WireKind, seq: number, ack: number, payload: Uint8Array): Uint8Array {
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

export function decodeEnvelope(data: Uint8Array): Envelope {
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
  const kind = data[3] as WireKind;
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

export function encodeJsonPayload(value: unknown): Uint8Array {
  return textEncoder.encode(JSON.stringify(value));
}

export function decodeJsonPayload<T>(payload: Uint8Array): T {
  return JSON.parse(textDecoder.decode(payload)) as T;
}

// ── Binary writer/reader ─────────────────────────────────────────────────

export class BinWriter {
  private buf: Uint8Array;
  private view: DataView;
  private pos = 0;

  constructor(initial: number = 256) {
    this.buf = new Uint8Array(initial);
    this.view = new DataView(this.buf.buffer);
  }

  private ensure(n: number): void {
    if (this.pos + n <= this.buf.byteLength) return;
    const next = new Uint8Array(Math.max(this.buf.byteLength * 2, this.pos + n));
    next.set(this.buf);
    this.buf = next;
    this.view = new DataView(this.buf.buffer);
  }

  public u8(v: number): void { this.ensure(1); this.view.setUint8(this.pos, v); this.pos += 1; }
  public u16(v: number): void { this.ensure(2); this.view.setUint16(this.pos, v, true); this.pos += 2; }
  public u32(v: number): void { this.ensure(4); this.view.setUint32(this.pos, v >>> 0, true); this.pos += 4; }
  public i32(v: number): void { this.ensure(4); this.view.setInt32(this.pos, v | 0, true); this.pos += 4; }

  public str(s: string): void {
    const bytes = textEncoder.encode(s);
    if (bytes.byteLength > 0xffff) throw new WireError('STRING_TOO_LONG', `string ${bytes.byteLength} bytes`);
    this.u16(bytes.byteLength);
    this.ensure(bytes.byteLength);
    this.buf.set(bytes, this.pos);
    this.pos += bytes.byteLength;
  }

  public finish(): Uint8Array {
    return this.buf.slice(0, this.pos);
  }
}

export class BinReader {
  private view: DataView;
  private pos = 0;

  constructor(private data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  private need(n: number): void {
    if (this.pos + n > this.data.byteLength) {
      throw new WireError('PAYLOAD_TRUNCATED', `need ${n} bytes at ${this.pos}, have ${this.data.byteLength}`);
    }
  }

  public u8(): number { this.need(1); const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
  public u16(): number { this.need(2); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  public u32(): number { this.need(4); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  public i32(): number { this.need(4); const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }

  public str(): string {
    const len = this.u16();
    this.need(len);
    const s = textDecoder.decode(this.data.subarray(this.pos, this.pos + len));
    this.pos += len;
    return s;
  }

  public get remaining(): number { return this.data.byteLength - this.pos; }
}
