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

## Guarantees (tested in `pnpm test:replay-v2`)

1. Live match final checksum == replayed final checksum.
2. All periodic checkpoints match during re-simulation.
3. Backward seek reproduces the identical state (checksum-equal).
4. A tampered command log fails checkpoint verification.
5. A replay from an unsupported format version is rejected with a clear
   user-facing message (никогда не тихий сбой).

## Compatibility policy

Old replays play only through a compatible core version. On format bump,
the loader raises `VERSION_UNSUPPORTED` with the supported version listed;
the replay browser must surface this as «несовместимая версия реплея».
