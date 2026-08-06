# Replay Format v2 (`RA4R`)

**Updated:** 2026-08-06

## Container (binary)

```
magic 'RA4R' | u16 formatVersion=2 | JSON header | command frames | checkpoints | keyframes
```

**Header** (JSON): format/sim/content/protocol versions, mapId, seed,
tickRate, players, startingCredits, durationTicks, result, recordedAtIso.

**Command frames**: `[u32 tick, u16 count, commands…]` using the Protocol v1
binary command codec. Frame ticks are strictly ascending (validated on load).
Convention: `frame.tick` is the post-step tick index; on playback commands
apply when `currentTick === frame.tick - 1` — bit-exact with live recording.

**Checkpoints**: `[u32 tick, u32 checksum]` every 300 ticks (10 s) — the
full-state checksum v2 (entities incl. shields/cooldowns/queues, players,
resource nodes, PRNG state).

**Keyframes**: full `WorldSnapshot` JSON every 1800 ticks — instant scrub
*previews* only; exact state always comes from deterministic re-simulation.

## Playback (`ReplayPlayerV2`)

- `step()` — one tick; validates checkpoints as it passes them.
- `seekToTick(t)` — exact seek via re-simulation (backward = restart from 0).
- `previewAt(t)` — nearest keyframe snapshot for immediate UI display.
- `verify()` — headless full playback; reports first divergence tick.

## Match identity

The header's `mapId`, `seed`, `players` and `startingCredits` are part of the
recorded match identity: `ReplayPlayerV2` reconstructs its simulation from all
four. Replaying on a different map changes spawns and resource nodes, so the
command log diverges immediately — this was a real regression when map
selection landed, and is now covered by the "Map identity" checks in
`pnpm test:replay-v2` (verified to fail without the fix).

## Download API (game server)

| Endpoint | Returns |
|---|---|
| `GET /api/v1/replays` | finished matches available for download (matchId, mapId, seed, winnerTeam, durationTicks, sizeBytes) |
| `GET /api/v1/replays/:matchId` | the `RA4R` binary container (`application/octet-stream`, `X-RA4-Replay-Format: 2`), 404 if outside the retention window |

The runtime's `onFinished` hook archives the replay **before** `GAME_OVER` is
broadcast, so a client that requests it immediately always finds it. The same
hook releases the match from `activeMatches`/`roomMatches` (finished matches
previously leaked there forever). In-memory retention is bounded to the last
50 matches; durable object storage is backend-program work.

## Guarantees (tested)

`pnpm test:replay-v2`:
1. Live match final checksum == replayed final checksum.
2. All periodic checkpoints match during re-simulation.
3. Backward seek reproduces the identical state (checksum-equal).
4. A tampered command log fails checkpoint verification.
5. An unsupported format version is rejected with a clear message.
6. A replay of a non-default map re-simulates on the recorded map.

`pnpm test:replay-download` (criterion #42, items 21–22):
7. A match played to completion is archived, listed, and downloadable.
8. The downloaded bytes are byte-identical to the recorded ones and carry a
   header describing the match actually played (seed, map, winner).
9. The downloaded replay reproduces the **identical final checksum and
   winner**, verifies all checkpoints, and mid-replay seeks stay exact.
10. An unknown matchId returns 404 rather than serving garbage.

## Compatibility policy

Old replays play only through a compatible core version. On format bump,
the loader raises `VERSION_UNSUPPORTED` with the supported version listed;
the replay browser must surface this as «несовместимая версия реплея».
