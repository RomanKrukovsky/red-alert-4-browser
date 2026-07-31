# RA4 Production Roadmap

## Phase 1: Core Engine & Vertical Slice (Completed)
- [x] Monorepo workspace architecture with 13 packages/apps
- [x] Fixed-point 30 Hz deterministic simulation engine (`sim-core`)
- [x] Content pipeline, Zod schema validation, SHA-256 hashing
- [x] Full vertical slice for all 4 factions (USSR, Alliance, Coalition, Chronolegion)
- [x] Babylon.js 3D WebGPU/WebGL2 renderer with RTS camera & materials
- [x] React 18 + Zustand HUD, Minimap, Production Panel, Command Bar
- [x] Authoritative WebSocket server (`game-server`)
- [x] Deterministic replay recording & playback (`replay`)
- [x] Web Map Editor application (`tools`)
- [x] 10,000-tick headless determinism test suite (`testing`)

## Phase 2: Expanded Roster & Campaign Foundation
- [ ] Implement full unit roster from Bible v2.0
- [ ] Advanced Flowfield pathfinding for 500+ unit swarms
- [ ] Single-player campaign triggers and mission scripting
