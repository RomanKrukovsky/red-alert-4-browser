# Simulation Architecture (`@ra4/sim-core`)

**Updated:** 2026-08-05 (Architectural Core Under Load slice)

## Invariants

1. **Purity.** sim-core never reads wall-clock time, schedules frames, touches DOM/React,
   or uses unseeded randomness. Enforced in CI by `pnpm check:sim-purity`
   (`tools/check-sim-purity.mjs`), which fails the build on `Math.random`, `Date.now`,
   `performance.now`, `requestAnimationFrame`, `setTimeout/Interval`, `new Date()`,
   `window`, `document`, `navigator` inside `packages/sim-core/src`.
2. **Fixed step.** 30 Hz (33.33 ms). The host owns the clock and calls
   `MatchLifecycleManager.advance(elapsedMs)`; a fixed-step accumulator converts
   elapsed host time into exact ticks (catch-up limit 5, spiral-of-death reset).
3. **Commands in, snapshots out.** `PlayerCommand` via `CommandBus` is the only input;
   `WorldSnapshot` (tick, checksum, seed, entities, players, shotFX) is the only output.
4. **One core, three environments.** The same TS module runs in:
   - a browser **Web Worker** (`apps/web-client/src/sim/simulation.worker.ts`),
   - the authoritative Node match server (`apps/game-server/MatchRuntime`),
   - headless CLI test runners (`packages/testing`, `tools/game-doctor`).

## Host topology (browser)

```
Main thread                       Web Worker
┌───────────────────────┐        ┌─────────────────────────────┐
│ React shell + HUD      │ INIT/  │ MatchLifecycleManager       │
│ Babylon renderer       │ START/ │  └ GameSimulation (30 Hz)   │
│ InputManager           │ CMD ──►│ setInterval(8ms) polls      │
│ SimWorkerClient        │◄─ SNAP │ advance(elapsed) → ticks    │
└───────────────────────┘        └─────────────────────────────┘
```

- Protocol: `apps/web-client/src/sim/workerProtocol.ts` (typed structured messages).
- The main thread renders from snapshot frames with interpolation alpha; game entities
  never live in React state.
- QA hooks: `DEBUG_ELIMINATE_PLAYER` (game-doctor victory scenario) and
  `RUN_DETERMINISM_PROBE` (cross-env gate) are worker messages, not sim features.

## Determinism gates (CI)

| Gate | Command | Assertion |
|---|---|---|
| Same-process | `pnpm test:determinism` | Two sims, same seed, 10 000 ticks → identical checksum |
| Cross-environment | `pnpm test:determinism:cross-env` | Node in-process vs real browser Web Worker, seed 424242, 5 000 ticks → identical checksum |
| Movement replay | `pnpm test:navigation-scale` (test 5) | Same seed + commands → identical movement checksum |

## Navigation (`navigation.ts`)

Three layers, all integer-based and iteration-order independent:

1. **Passability grid** (`Uint8Array`): terrain (value 1, permanent) + refcounted
   building obstacles (values ≥ 2). `spawnBuilding` registers footprints;
   `removeEntity` unregisters them. Units may never step into blocked tiles
   (hard constraint in the movement system, with edge-sliding and an escape
   override for units standing on blocked tiles).
2. **A\*** with a deterministic binary heap (tie-break: f, then h, then insertion
   sequence), octile heuristic, no diagonal corner-cutting, collinear waypoint
   simplification.
3. **Flow fields** for group orders (> 8 units): one Dijkstra integration field per
   goal tile shared by the whole group, LRU-cached (64 entries), invalidated when
   the grid changes. Units follow the field until within 3 tiles of their formation
   slot, then home in directly.

Scale guarantees are tested in `packages/testing/src/navigationScale.test.ts`:
wall-gap routing, 100-unit convergence ≥ 90 %, 500 crossing units with zero
blocked-tile entries and ≥ 80 % progress, corridor plug/unplug by building
placement/destruction, checksum-identical reruns.

## Performance model

Hot-path rules (validated by profiling, see `artifacts/benchmarks/stress-1500.json`):

- **Spatial hash grid** stores entity references (not ids) in reusable numeric-indexed
  buckets — zero per-tick allocation, no string keys, no Set, no Map lookups in
  avoidance/targeting scans (`forEachInRadius` callback API).
- **Content lookups** go through immutable `Map`s (`UNIT_SPEC_BY_ID` etc.), never
  `Array.find` in the tick loop.
- **Retarget throttling:** idle armed entities rescan for targets every 5 ticks,
  staggered by `(tickIndex + id) % 5` — deterministic.
- **FoW refresh** every 3 ticks (`tickIndex % 3 === 1`) — deterministic.

**1500-entity stress benchmark** (`pnpm benchmark:stress-1500`): 2×750 mixed
infantry/tanks in a cross-map attack-move collision, 1 500 measured ticks.

Current results (M-series laptop, Node 20):

| Metric | Value | Budget |
|---|---|---|
| p50 | 4.9 ms | — |
| p95 | 5.6 ms | **< 8 ms (Rust/WASM gate)** |
| p99 | 5.8 ms | < 33.33 ms (30 Hz frame) |

> ⚠️ **Stale as of the stance/standing-order change (2026-08-06).** These
> figures predate two-stage target acquisition. Attempts to re-measure ran on
> a machine under load average 24–120, where successive runs of the same build
> varied by >10× (p95 13 ms → 377 ms), so no trustworthy number could be
> taken. Re-measure on an idle machine before relying on this table or on the
> WASM-gate verdict. See `docs/game-design/army-control.md` § Known gap.

**Rust/WASM decision gate:** if p95 on this benchmark exceeds 8 ms after a feature
addition, the hot systems (pathfinding first) are ported to Rust/WASM behind the
same command/snapshot boundary. The gate is recorded in the benchmark JSON
(`wasmGateTriggered`).

## Checksum

```ts
hash = ((hash << 5) - hash) + e.id + e.x + e.y + e.hp + e.currentOre; hash |= 0;
```

Known limitation: the checksum does not yet cover shields, cooldowns, veterancy,
production queues, or PRNG state. Extending it is scheduled together with the
versioned replay format (next slice) so replays and hashes change format once.
