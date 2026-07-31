# RA4 RTS Engine Architecture Guide

## Overview
RA4 is a modern, high-performance, deterministic browser-based RTS engine designed for AAA-grade asymmetric multiplayer gameplay.

## Package Architecture & Layering

```
                     ┌────────────────────────────────┐
                     │        apps/web-client         │
                     │  (Babylon.js 3D + React UI)    │
                     └───────────────┬────────────────┘
                                     │
                     ┌───────────────▼────────────────┐
                     │          packages/ui           │
                     │     (Zustand + React HUD)      │
                     └───────────────┬────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
┌────────▼─────────┐       ┌─────────▼────────┐        ┌─────────▼────────┐
│ packages/netcode │       │packages/sim-core │        │ packages/replay  │
│ (Command Protocol│       │(Deterministic    │        │(Replay Player/   │
│ & Anti-Cheat)    │       │ 30Hz Fixed-Step) │        │ Recorder)        │
└────────┬─────────┘       └─────────┬────────┘        └─────────┬────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                     ┌───────────────▼────────────────┐
                     │    packages/content-runtime    │
                     │  (Zod Schemas + Data Assets)   │
                     └───────────────┬────────────────┘
                                     │
                     ┌───────────────▼────────────────┐
                     │     packages/shared-types      │
                     │   (Enums, Commands, DTOs)      │
                     └────────────────────────────────┘
```

### Key Principles
1. **Single Source of Truth**: All authoritative game simulation logic resides exclusively inside `packages/sim-core`. The renderer and UI have zero gameplay logic.
2. **Fixed-Step Scaled Integers**: 30 Hz tick simulation powered by scaled integer arithmetic (`FixedInt`, 1000 units = 1 tile). Zero raw floats in authoritative code.
3. **Command Protocol**: Clients transmit player intent commands (`PlayerCommand`). The server validates commands, steps the simulation, and broadcasts tick frames & snapshots.
