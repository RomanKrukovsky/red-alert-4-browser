# Backend Audit: red-alert-4-browser

## Executive Summary
This document provides a comprehensive audit of the current state of the backend, networking layer (`@ra4/netcode`), simulation engine (`@ra4/sim-core`), replay system (`@ra4/replay`), and client-side integration in the `red-alert-4-browser` repository.

---

## 1. What Is Implemented
1. **Deterministic Sim Core (`@ra4/sim-core`)**:
   - `GameSimulation` engine with fixed 30 Hz tick step execution.
   - Deterministic Pseudo-Random Number Generator (`Mulberry32PRNG`).
   - Spatial Hash Grid (`SpatialHashGrid`), Fog of War (`FogOfWarManager`), Navigation grid (`NavigationService`), and Superweapon handling (`SuperweaponManager`).
   - Command processing through Command Bus (`MOVE`, `ATTACK`, `STOP`, `HOLD`, `BUILD_STRUCTURE`, `PRODUCE_UNIT`, `CANCEL_PRODUCTION`, `TRIGGER_SUPERWEAPON`).
   - Snapshot generation (`createSnapshot()`) and state restoration.

2. **Networking & Protocol Types (`@ra4/netcode`, `@ra4/shared-types`)**:
   - WebSockets-based communication primitives (`ws` package).
   - Message serializers & deserializers (`serializeClientMessage`, `deserializeServerMessage`).
   - Command validation module (`validatePlayerCommand`) checking entity ownership and map boundary constraints.

3. **Replay System (`@ra4/replay`)**:
   - `ReplayRecorder` for tick frame collection and JSON serialization.
   - `ReplayPlayer` for headless replay playback against `GameSimulation`.

4. **Prototype Game Server (`apps/game-server`)**:
   - Simple WebSocket server running on port 8080.
   - Fixed 30 Hz timer broadcasting `TICK_FRAME` and 1-second `STATE_SNAPSHOT`.
   - In-memory single `GameRoom` setup.

---

## 2. Existing Server Modules & Stubs
| Module | Location | Status | Current Implementation Notes |
|---|---|---|---|
| Game Server Entry | `apps/game-server/src/index.ts` | **Stub Prototype** | Hardcoded single `GameRoom`, no HTTP API, no persistence, port 8080. |
| Netcode Validator | `packages/netcode/src/validator.ts` | **Partial** | Basic playerIndex and entity ownership checks; missing tech tree, cost, cooldown, range, fog of war checks. |
| Netcode Protocol | `packages/netcode/src/protocol.ts` | **Minimal** | JSON serialization without schema validation or compression. |
| Replay Engine | `packages/replay/src/index.ts` | **Functional Prototype** | Record and playback in-memory/JSON; no database persistence or API endpoints. |
| Client Network Client | `apps/web-client` | **Client-Authoritative Run** | Single-player runs local `MatchLifecycleManager` inside browser tab. |

---

## 3. Client Trust & Vulnerabilities (Cheat Vectors)
Currently, in single-player or standalone client runs:
1. **Direct State Access**: Client code can mutate local simulation state (`credits`, `hp`, unit creation) if running locally.
2. **Missing Server-Side Tech/Resource Checks**: Server validation in `validator.ts` does not verify if the player has enough credits or requisite tech buildings to execute `PRODUCE_UNIT` or `BUILD_STRUCTURE`.
3. **No Auth Token Validation**: WS connection relies on raw player name string in `JOIN_LOBBY` without authentication signatures, JWT, or password verification.
4. **No Rate Limiting / Flooding Protection**: WS messages are parsed without rate limiting, allowing potential DoS or command spam.
5. **Client Admin Console Exploitation**: Admin console commands like `spawn`, `give`, `fog`, `god`, `win` execute on local state without server authorization checks.

---

## 4. Current Server Launch & Testing
- **Server Startup**: `pnpm --filter @ra4/game-server dev` or `node apps/game-server/dist/index.js`.
- **Test Suite**:
  - `pnpm test` (runs turbo build/test in workspace).
  - Determinism test: `pnpm test:determinism`.
  - AI Scenarios test: `pnpm test:ai:scenarios`.
  - Missing: Integration tests for WebSocket auth, lobby state machine, reconnect, admin authorization, database persistence.

---

## 5. Architectural Decision: Parts to Keep vs Rework

### Keep
- `@ra4/sim-core`: Full 30 Hz deterministic simulation core, `GameSimulation`, PRNG, snapshots.
- `@ra4/replay`: Replay playback logic and tick recording structure.
- `@ra4/shared-types`: Core enums, command definitions, snapshot types.

### Rework & Extend
- `apps/game-server`: Upgrade to modular production Fastify + `@fastify/websocket` server with PostgreSQL (Drizzle ORM) and Redis.
- `@ra4/netcode`: Upgrade protocol to Zod schema validation, explicit reconnect handshakes, sequence numbers, checksum validation, anti-cheat validation.
- Admin System: Move admin console evaluation to server-side authority with strict role guards (`admin` role in DB JWT).
- Reconnect System: Add server-side snapshot buffering and sequence replay for dropped clients.
- Matchmaking: Build Redis-backed matchmaking queue with expanding rating bounds.
