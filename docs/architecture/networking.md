# Networking Architecture — Protocol v1

**Updated:** 2026-08-06 (Protocol v1 + Replay v1 slice)

## Authority model

The server simulation is the single source of truth:

1. Clients send commands (binary `SUBMIT_COMMANDS`).
2. The server validates every command against the authoritative state
   (`@ra4/netcode` `validatePlayerCommand`): playerIndex integrity, entity
   ownership, map bounds, real content-data costs vs credits, faction match,
   tech-tree prerequisites, command cap, queue limits, per-tick rate limits.
3. Validated commands apply on the next server tick and broadcast in binary
   `TICK_FRAME` messages; clients re-simulate deterministically from the
   same command stream (same `@ra4/sim-core` in a Web Worker).
4. Every 90 ticks the server broadcasts `CHECKSUM_STATE`; clients compare
   and report via `CHECKSUM_REPORT`. Mismatches are recorded as desync
   events on the server.
5. Match results are computed server-side; the client never reports outcome.

## Wire format (`@ra4/netcode/wire`)

Binary envelope on every WebSocket frame:

| offset | size | field |
|---|---|---|
| 0 | 2 | magic `'R','A'` |
| 2 | 1 | protocol version (`PROTOCOL_VERSION = 1`) |
| 3 | 1 | message kind (`WireKind`) |
| 4 | 4 | sequence number (per-sender monotonic, LE) |
| 8 | 4 | ack (highest contiguous seq received) |
| 12 | 4 | payload length |
| 16 | n | payload |

- Match-critical payloads (commands, tick frames, checksums) use a compact
  hand-coded binary codec (`commandCodec.ts`, exhaustive over all 17
  `CommandType`s; ~4.6× smaller than JSON on the test corpus).
- Lobby/meta payloads are UTF-8 JSON inside the same versioned envelope.
- Version mismatch, bad magic, truncation, and oversize frames (>512 KiB)
  are rejected with typed `WireError`s.

## Sequencing (`channel.ts`)

`ProtocolChannel` is transport-agnostic (browser WS / Node ws / in-memory):

- monotonic seq per sender; acks piggybacked on every frame;
- duplicate/replayed frames (seq ≤ last delivered) are dropped — replay
  protection at the transport layer;
- heartbeats when idle (2 s default) and peer-timeout detection (10 s);
- injected clock (`now()`) — deterministic in tests, no wall-clock reads.

## Match runtime (`apps/game-server/matches/matchRuntime.ts`)

- 30 Hz fixed-step authoritative loop.
- Per-player per-tick command budget (32) — anti-flood.
- Snapshot history every 30 ticks (last 300 retained) for reconnect.
- **Reconnect window: 90 s** (`RECONNECT_WINDOW_MS`). Token-checked; window
  expiry → reconnect refused and the player is auto-surrendered.
- Records the match with `ReplayRecorderV2` and persists the binary replay
  (base64 in Postgres for now; object storage lands with the content CDN).

## Tests

| Suite | Command | Covers |
|---|---|---|
| Wire format | `pnpm test:protocol-v1` | envelope round-trip/rejection, all 17 command codecs, size budget, JSON/Cyrillic, seq/ack/dedup/heartbeat/timeout |
| Server authority | `pnpm test:server-auth` | 2 simulated clients re-simulating the binary TICK_FRAME stream to identical checksums; replay verification; cheat rejection (foreign entities, spoofing, unaffordable, wrong faction, missing tech); desync recording; reconnect window |
| Replay | `pnpm test:replay-v2` | see `docs/architecture/replay.md` |

All are part of `pnpm test:ci`.
