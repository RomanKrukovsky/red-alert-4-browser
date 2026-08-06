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
export declare const PROTOCOL_VERSION = 1;
export declare const WIRE_MAGIC_0 = 82;
export declare const WIRE_MAGIC_1 = 65;
export declare const ENVELOPE_HEADER_SIZE = 16;
/** Hard cap — a frame larger than this is a protocol violation. */
export declare const MAX_FRAME_BYTES: number;
export declare enum WireKind {
    HEARTBEAT = 1,
    HELLO = 2,// JSON: version negotiation + auth token
    HELLO_ACK = 3,// JSON: assigned playerIndex, roomId
    PROTOCOL_ERROR = 4,// JSON: { code, message }
    LOBBY_JSON = 10,
    SUBMIT_COMMANDS = 20,// client → server: PlayerCommand[]
    TICK_FRAME = 21,// server → client: tick + validated PlayerCommand[]
    CHECKSUM_REPORT = 22,// client → server: tick + checksum
    CHECKSUM_STATE = 23,// server → client: tick + authoritative checksum
    SNAPSHOT_JSON = 24,// server → client: full WorldSnapshot (JSON, rare: join/reconnect)
    MATCH_START_JSON = 25,
    GAME_OVER_JSON = 26
}
export interface Envelope {
    version: number;
    kind: WireKind;
    seq: number;
    ack: number;
    payload: Uint8Array;
}
export declare class WireError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare function encodeEnvelope(kind: WireKind, seq: number, ack: number, payload: Uint8Array): Uint8Array;
export declare function decodeEnvelope(data: Uint8Array): Envelope;
export declare function encodeJsonPayload(value: unknown): Uint8Array;
export declare function decodeJsonPayload<T>(payload: Uint8Array): T;
export declare class BinWriter {
    private buf;
    private view;
    private pos;
    constructor(initial?: number);
    private ensure;
    u8(v: number): void;
    u16(v: number): void;
    u32(v: number): void;
    i32(v: number): void;
    str(s: string): void;
    finish(): Uint8Array;
}
export declare class BinReader {
    private data;
    private view;
    private pos;
    constructor(data: Uint8Array);
    private need;
    u8(): number;
    u16(): number;
    u32(): number;
    i32(): number;
    str(): string;
    get remaining(): number;
}
//# sourceMappingURL=wire.d.ts.map