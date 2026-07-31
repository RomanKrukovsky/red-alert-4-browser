# RA4 Browser RTS — Factual Project Audit (Stage 0)

**Date**: July 31, 2026  
**Auditor**: Lead RTS Architect & Principal Fullstack Engineer  
**Scope**: Workspace audit, build verification, architecture boundaries, system readiness matrix, technical debt.

---

## 1. Executive Summary

The codebase is structured as a clean TypeScript monorepo with 13 packages/apps (`pnpm` workspace + Turbo). The **Game Core** (`packages/sim-core`) implements a deterministic 30 Hz fixed-step simulation engine using scaled integers (`FixedInt`), Mulberry32 PRNG, a uniform spatial hash grid, damage matrix calculations, ore harvesting, power grid priority logic, and victory conditions.

All 13 workspace packages compile without TypeScript errors (`pnpm build`), content validation passes (`pnpm content:validate`), and a 10,000-tick headless determinism test passes cleanly without desync (`pnpm test:determinism`).

---

## 2. System Readiness Matrix

| System / Component | Status | Detailed Assessment |
| :--- | :--- | :--- |
| **Monorepo & Build Pipeline** | **FULLY WORKING** | Turbo task runner, Vite 6, TypeScript 5.7, pnpm workspaces configured and verified. |
| **Deterministic Sim Core** | **FULLY WORKING** | 30 Hz fixed-tick engine, `FixedInt` scaled math, Mulberry32 PRNG, Spatial Hash Grid, Fog of War map. |
| **Content Pipeline & Schema** | **FULLY WORKING** | Zod schemas (`content-schema`), 4-faction database (`content-runtime`), SHA-256 content hasher, validation CLI. |
| **Match Lifecycle Manager** | **PARTIALLY WORKING** | Basic start/stop interval in `App.tsx`; requires formal `initialize`, `start`, `pause`, `resume`, `stop`, `dispose` lifecycle with memory cleanup. |
| **3D Presentation (Babylon.js)** | **PARTIALLY WORKING** | Engine setup, ArcRotateCamera, basic terrain plane, entity mesh proxies; missing visual placement ghost, particle FX, healthbars, selection rings. |
| **Input & Selection Engine** | **STUB / MISSING** | Mouse raycast picking, box selection rectangle, WASD RTS camera panning, edge panning, and hotkey groups are not yet bound to the 3D canvas. |
| **Pathfinding & Navigation** | **PARTIALLY WORKING** | Direct vector movement to coordinates works; requires A* grid pathfinding (`NavigationService`), obstacle avoidance, and group formation grid offsets. |
| **Combat & Damage Engine** | **FULLY WORKING** | Range checks, weapon cooldowns, armor type vs damage type multipliers, shield absorption, HP reduction, entity destruction. |
| **Economic & Harvest Loop** | **FULLY WORKING** | Harvesters find ore nodes, harvest 100 ore/15 ticks, return to refinery, deposit credits, nodes deplete. |
| **Base Building & Production** | **PARTIALLY WORKING** | Sim-core handles building placement & unit queues; 3D placement ghost preview and grid snapping need integration. |
| **Skirmish AI** | **PARTIALLY WORKING** | Auto-attack targeting works; requires a strategic AI State Machine (economy maintenance, base expansion, army recruitment, attack waves). |
| **React UI Layer** | **FULLY WORKING** | HUDHeader, Minimap 2D canvas, ProductionPanel, CommandBar, EVALog, Zustand store (`useUIStore`) updating event-driven. |
| **Authoritative Server** | **FULLY WORKING** | WebSocket server (`apps/game-server`), room lifecycle, tick frame broadcasting, state snapshots, anti-cheat command validation. |
| **Replay System** | **FULLY WORKING** | Replay recorder & deterministic playback player (`packages/replay`). |

---

## 3. Architectural Boundary Assessment

1. **Game Core Independence**: `packages/sim-core` contains zero dependencies on React or Babylon.js. Authoritative logic runs identically in browser, Node.js server, and headless CLI tests.
2. **Fixed-Step Simulation**: Tick step is strictly 30 Hz (33.33ms), independent of browser rendering frame rate.
3. **Command Protocol**: All actions (Move, Attack, Build, Produce) flow through `PlayerCommand` objects passed into `sim.processCommands()`.
4. **Data-Driven UI**: React UI receives tick snapshot ViewModels via Zustand without per-frame DOM polling.

---

## 4. Technical Debt & Sequential Fix Plan

1. **Stage 1 (Architecture & Lifecycle)**: Formalize `MatchLifecycle` with clean resource disposal (`dispose()`) and position interpolation between ticks.
2. **Stage 2 (Camera, Input & Selection)**: Build `RTSCamera` (WASD, edge pan, scroll zoom), `InputManager` (raycast picking, drag-box selection, right-click context commands), and hotkey groups (Ctrl+1..9).
3. **Stage 3 (Navigation & Formations)**: Build `NavigationService` (A* grid pathfinding, path smoothing, group formation grid offsets, Stop/AttackMove behavior).
4. **Stage 4 (Combat & Effects)**: Add visual selection rings, 3D healthbars, projectile visuals, and particle explosions.
5. **Stage 5 (Economic Loop Polish)**: Queue harvesters at refineries, visual ore node depletion stages.
6. **Stage 6 (Building Placement Ghost)**: Add translucent building placement preview with green/red grid snapping.
7. **Stage 7 (Skirmish AI Agent)**: Build fair FOW-constrained AI State Machine for economy, expansion, unit production, and attack waves.
8. **Stage 8 (Game Flow & Menus)**: Main Menu, Skirmish Setup, Pause Overlay, Victory/Defeat screens.
