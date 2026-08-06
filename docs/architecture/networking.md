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

## Browser client (`apps/web-client/src/net/`)

`NetworkMatchClient` — Protocol v1 over the DOM WebSocket:
- binary frames through `ProtocolChannel` (seq/ack/heartbeat/dedup);
- `submitCommands` → server validation (never applied locally first);
- receives `TICK_FRAME`, `CHECKSUM_STATE`, `SNAPSHOT_JSON`,
  `MATCH_START_JSON`, `GAME_OVER_JSON`;
- compares the server's checksum against the local one per tick and raises
  `onDesync`; reports its own checksum back for server-side detection;
- reconnect with bounded backoff (500 ms → 30 s, ≈60 s of attempts inside
  the server's 90 s window), resuming via `RECONNECT` + snapshot restore.

`NetworkedMatchSession` binds the client to the simulation Worker:

```
input → submitCommands → SERVER (validate) → TICK_FRAME
                                                ↓
                           sim Worker: processCommands + step (exactly 1 tick)
                                                ↓
                           TICK_APPLIED (local checksum) → reportChecksum
                                                ↓
                                    SNAPSHOT → renderer / HUD
```

The Worker runs in **networked mode** (`INIT_NETWORKED`): it owns no clock,
so the server's tick stream is the only time source and local frame pacing
cannot cause divergence. Match config comes verbatim from the server's
`MATCH_START_JSON` (`players`, `seed`, `tickRate`, `startingCredits`) —
the client never infers factions from a snapshot.

## Multiplayer UI flow

```
Main menu (СЕТЕВАЯ ИГРА)
  → MULTIPLAYER_CONNECT  #/multiplayer        server URL + callsign
  → MULTIPLAYER_LOBBY    #/multiplayer/lobby  authoritative slot roster
  → LOADING              #/loading            renderer + first authoritative tick
  → MATCH                #/hud/<faction>      in-match, network banner visible
```

Screens live in `apps/web-client/src/ui/screens/MultiplayerScreens.tsx`.
Every control issues a real protocol message; the roster is rendered from the
server's lobby state, never from local guesses. `NetworkStatusBanner` shows
live transport state (connecting / reconnecting / desync) in both lobby and
match — it is not decorative.

Authority-preserving UI rules:
- input dispatch routes through the network session when one exists, so
  commands are validated server-side before they can affect the world;
- **pause is disabled in a networked match** — the server owns the clock, and
  pausing locally would stall tick application and desync the client;
- leaving a live networked match sends `SURRENDER` so the server records the
  result rather than inferring it from a dropped socket;
- the deep-link auto-start (`#/hud/...` starts a local skirmish) is suppressed
  while a networked session owns the match, preventing a second
  non-authoritative simulation from being spawned on top.

`hostIndex` and the joiner's own slot come from the server (`JOIN_ACK`);
the client never infers its own index by matching player names.

## Gateway fixes landed with the browser client

Six defects that would have broken any real 2+ player match:

1. **`START_MATCH` attached only the initiator's socket** (`ws: s.index === playerIndex ? socket : null`) — every other player would have received zero tick frames. Now a `roomSockets` registry attaches every connected player's socket.
2. **`currentMatch` was per-socket closure state**, so non-initiating players' command/checksum frames were silently dropped. Now a `roomMatches` (room → match) binding resolves the live match for every socket.
3. **`RECONNECT` looked up `activeMatches` by roomId** while that map is keyed by matchId — reconnect could never succeed. Now resolved through `roomMatches`, and the socket is re-registered on resume.
4. **The default room was created with a random UUID id** while clients join the well-known `'default-room'` — so *every* `JOIN_LOBBY` failed with "Room not found" and the lobby never opened. The bootstrap room now uses the stable id.
5. **Lobby mutations replied only to the sender** (`SET_READY`, `SET_SLOT`, `JOIN_LOBBY`) — no client ever saw another player's readiness or faction, so readiness never converged and the host's start button stayed permanently disabled. All lobby mutations now broadcast to the whole room.
6. **A thrown handler error was logged server-side only**, leaving the client waiting forever with no feedback. Failures now return an `ERROR` frame to the sender.

## Tests

| Suite | Command | Covers |
|---|---|---|
| Wire format | `pnpm test:protocol-v1` | envelope round-trip/rejection, all 17 command codecs, size budget, JSON/Cyrillic, seq/ack/dedup/heartbeat/timeout |
| Server authority | `pnpm test:server-auth` | 2 simulated clients re-simulating the binary TICK_FRAME stream to identical checksums; replay verification; cheat rejection (foreign entities, spoofing, unaffordable, wrong faction, missing tech); desync recording; reconnect window |
| Multiplayer E2E | `pnpm test:multiplayer-e2e` | two clients over a **real WebSocket** to a real runtime: MATCH_START delivery, per-tick client↔client↔server checksum parity across all common ticks, zero desync events, both players' builds accepted, foreign-entity order never entering the authoritative stream |
| **Two real browsers** | `pnpm test:multiplayer-two-browsers` | acceptance criterion #42 through the **actual UI**: real game server + two independent Chromium instances click menu → connect → lobby → ready → start, both reach the in-match HUD, and **all common ticks are checksum-identical across clients** with zero desync vs the server. Writes screenshots of both clients. |
| Replay | `pnpm test:replay-v2` | see `docs/architecture/replay.md` |

The first four are part of `pnpm test:ci`. The two-browser gate is run
separately (it boots a real server and two browsers; ~40 s).
