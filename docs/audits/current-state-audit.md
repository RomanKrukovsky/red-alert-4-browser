# RA4 Web RTS — Consolidated Current-State Audit (Phase 0)

**Date:** 2026-08-05
**Auditor:** Autonomous engineering team (Architect/Planner lead)
**Scope:** Full workspace `/red-alert-4-browser` (pnpm + Turbo monorepo), git history (30 commits), docs, tests, content data, backend, tooling.

---

## 1. Verified facts (executed / measured, not assumed)

| Check | Result |
|---|---|
| `pnpm test:determinism` (10 000 ticks headless) | **PASS**, checksum `564238948`, stable across runs |
| Workspace structure | 3 apps (`web-client`, `game-server`, `tools`), 10 packages, `tools/game-doctor` |
| LOC (src, TS/TSX) | sim-core 2 578 · content-runtime 1 801 · content-schema 1 041 · ui 2 511 · web-client 4 534 · game-server 3 163 · game-doctor 1 195 · **netcode 94 · replay 109 · map-editor 53** |
| Non-determinism scan in sim-core | Clean except `lifecycle.ts:53` `performance.now()` — used only for frame pacing (presentation side), **not inside tick logic**; must still be moved out of the sim package boundary |
| Web Worker usage in web-client | **None found** — simulation runs on the main thread |
| Content DB | 4 factions × 17 entries each (68 units/buildings) in `content-runtime/database.ts`, Zod-validated, legacyAlias migration from Bible v2.0 naming reset |
| Server | Fastify + @fastify/websocket, Drizzle/Postgres, ioredis, JWT auth, admin service, lobby/matchmaking/matches/observability modules; `MatchRuntime` instantiates `GameSimulation` server-side |
| compose.yaml | postgres:16, redis:7, game-server — plausible runnable local stack |
| game-doctor | Playwright-driven autonomous playtest bot; latest report 2026-08-01: full match E2E PASS, sim tick avg 0.08 ms, 42 meshes, 18 draw calls, 45 MB heap; 9 screenshot proofs |
| Visual references | `SCREENSHOTS/1–24.png` (1672×941) — a complete approved-style UI reference set, catalogued in `docs/ui/REFERENCE_SCREEN_CATALOG.md` with per-screen composition breakdown and design tokens per faction |
| Game bible | `RA4_Factions_Units_Economy_Voice_Bible_v2_Naming_Reset.md` (~222 KB) — full 4-faction roster with IP-safe naming reset (LegacyAliases table), economy constants, voice design |
| Assets | 23 runtime GLBs (3.85 MiB), all CC0 (Quaternius/Kenney/PolyHaven), license manifest with hashes; 5 Sketchfab candidates blocked on OAuth |
| Uncommitted changes | game-doctor uiAuditor additions, HUD CSS edits, sim-core edits — working tree dirty on `main` |

## 2. What exists and is worth keeping

1. **Deterministic sim-core (TS)** — 30 Hz fixed tick, `FixedInt` scaled-integer math, Mulberry32 PRNG, spatial hash grid, FoW manager, damage matrix, harvest loop, power priority, superweapon manager (4 faction superweapons), victory conditions, snapshot/restore, checksum. Proven by 10k-tick determinism test and headless AI self-play to victory (seed 20260801, tick 9519).
2. **Content pipeline** — Zod schemas, 4-faction database, SHA-256 content hash, validation CLI. Data-driven; matches the bible's Stable IDs.
3. **Hierarchical skirmish AI** — Scheduler, Blackboard, World Model with FoW-honest memory, Economy/Base/Production/ArmyGroup/Tactical managers. Fair-play verified (no hidden-info reads, no free resources).
4. **Server skeleton** — Fastify WS server that runs the authoritative `GameSimulation`, JWT auth, lobby/matchmaking/admin modules, Postgres+Redis wiring, 5 server test suites (auth, lobby, reconnect, admin, match runtime).
5. **game-doctor** — a genuinely valuable autonomous QA asset: browser playtest bot + headless/stress/soak/visual-audit modes with report generation.
6. **UI reference canon** — 24 high-res screens covering splash → menus → 4 campaign homes → briefings → loading → 4 faction HUDs → skirmish setup → HUD variants. Plus reconstruction CSS/tokens already partially implemented (4 faction themes).
7. **UI layer** — React + Zustand, event-driven ViewModels (no per-frame DOM polling), faction-themed HUD reconstruction in progress.
8. **CC0 asset pipeline** — fetch/verify/process/report tooling with license audit.

## 3. What is missing or inadequate (gaps)

| # | Gap | Severity |
|---|---|---|
| 1 | **No Web Worker isolation** — sim + pathfinding run on the UI thread; will not survive 500+ units + rendering | High |
| 2 | **Pathfinding is minimal** (152 LOC `navigation.ts`) — no HPA*/flow fields, no group movement at scale, no dynamic obstacles/choke reservation | High |
| 3 | **netcode = 94 LOC** — JSON protocol, no schema versioning, no binary framing, no seq/ack, partial validation (no cost/tech/cooldown/range checks in validator) | High |
| 4 | **replay = 109 LOC** — records tick frames to JSON; no format versioning, no snapshots/seek, no viewer UI | High |
| 5 | **Client is still client-authoritative in practice** — solo match runs local sim; server path exists but the client↔server match flow is not the default loop | High |
| 6 | **map-editor = 53 LOC stub**; no mission graph, no campaign runtime | High |
| 7 | Sim entity model is not a formal ECS with documented system ordering; 830-LOC `simulation.ts` monolith will strain under 30+ systems (abilities, status effects, transport, garrison, veterancy, capture, naval/air layers absent) | Medium-High |
| 8 | Only vertical-slice roster is playable end-to-end (USSR vs Alliance validated); Coalition/Chronolegion content exists in data but combat/ability coverage untested | Medium |
| 9 | Audio is synthesized WebAudio tones; no real VO/music/SFX assets | Medium |
| 10 | Units render partly as primitives (5 specIds have GLB profiles); no instancing strategy for hundreds of units; FoW is not GPU-shaded | Medium |
| 11 | No matchmaking rating, no ranked, no reconnect-window 90 s validation under real network faults, no desync telemetry pipeline | Medium |
| 12 | No CI pipeline file found (tests run locally via `test:ci` script only); no visual-regression baseline management; no infra/terraform/k8s | Medium |
| 13 | No localization framework (strings are hardcoded RU in content/UI) | Medium |
| 14 | Legal: `docs/legal/` absent; product still branded "Red Alert 4 / Command & Conquer" in splash reference art — release brand required | Medium (release-blocking) |
| 15 | Working tree dirty on `main`; branch hygiene needed | Low |

## 4. Key risks

1. **Main-thread sim** — the single biggest architectural risk; must move to Worker with snapshot/delta messaging *before* content scale-up, or every later system multiplies rework.
2. **Determinism across environments** — TS core is deterministic in Node; must prove identical checksums in browser Worker + server Node under one shared test vector set before investing in multiplayer.
3. **Pathfinding scale** — current direct-vector movement will collapse at 100+ unit group orders; needs hierarchical grid + flow fields.
4. **Protocol debt** — JSON without versioning will force painful migration once replays/ranked exist; fix early, cheaply.
5. **Rust/WASM rewrite temptation** — measured sim tick is 0.08 ms avg at slice scale; a rewrite now is **not justified**. Decision gate: if profiled tick p95 > 8 ms at 1 500-entity stress with full systems, port hot systems (pathfinding first) to Rust/WASM behind the same command/snapshot boundary.
6. **IP exposure** — splash art references "Command & Conquer"; unit naming is already reset (bible v2.0) but brand/logo/splash must be replaced before any public release.

## 5. Reuse verdict

- **KEEP:** sim-core (extend), content-schema/runtime, AI package, game-server skeleton, game-doctor, UI reference canon + tokens, asset pipeline, bible data.
- **EXTEND/REWORK:** netcode (binary + versioned), replay (versioned format + snapshots + viewer), navigation (hierarchical), web-client (Worker isolation, instanced rendering), server match flow (make server-authoritative path the default for MP).
- **REPLACE:** map-editor stub, synthesized audio, primitive unit meshes (production assets), splash/branding.
- **UE version:** lives in the separate `red-alert-4` repo; untouched. Shared game data (bible) is already format-independent.
