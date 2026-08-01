# Backend Architecture Specification: red-alert-4-browser

## 1. System Component Overview & Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  React UI + Babylon.js Renderer + NetworkClient WS + InputManager                 |
+----------------------------------------+------------------------------------------+
                                         | HTTP / WebSocket
                                         v
+-----------------------------------------------------------------------------------+
|                         SERVER-AUTHORITATIVE BACKEND (Fastify)                    |
|                                                                                   |
|  +---------------------------+  +-------------------------+  +-----------------+  |
|  | Fastify HTTP REST Gateway |  | Auth & Security Manager |  | Admin Gateway   |  |
|  | - /api/v1/auth            |  | - Argon2 / JWT          |  | - Role Guards   |  |
|  | - /api/v1/users           |  | - Rate Limiter (Redis)  |  | - Audit Logger  |  |
|  | - /api/v1/replays         |  | - Brute-Force Protect   |  |                 |  |
|  | - /health, /ready         |  +-------------------------+  +-----------------+  |
|  +---------------------------+                                                    |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | WebSocket Match Gateway                                                     |  |
|  | - Handshake & Connection Auth Validation                                    |  |
|  | - Room Lifecycle & Matchmaking Queue                                        |  |
|  | - Desync Detection & Reconnect Buffer                                       |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|                                        v                                          |
|  +-----------------------------------------------------------------------------+  |
|  | Authoritative Match Runtime (30 Hz Tick Loop)                               |  |
|  | - Instance of @ra4/sim-core (GameSimulation)                                |  |
|  | - Command Bus & Anti-Cheat Validator (@ra4/netcode)                         |  |
|  | - Snapshot Generator (every 30 ticks = 1s)                                   |  |
|  | - Replay Stream Recorder (@ra4/replay)                                      |  |
|  +-------------------------------------+---------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         |
                         +---------------+---------------+
                         |                               |
                         v                               v
            +------------------------+      +--------------------------+
            |  PostgreSQL 16 (DB)    |      |  Redis 7 (In-Memory)     |
            |  - Users & Profiles    |      |  - Active Sessions       |
            |  - Match Results       |      |  - Matchmaking Queues    |
            |  - Replay Storage      |      |  - Room States & Locks   |
            |  - Audit Logs & Bans   |      |  - Rate Limit Counters   |
            +------------------------+      +--------------------------+
```

---

## 2. Trust Boundaries & Data Flow

### Trust Model
1. **Client Tier**: Fully UNTRUSTED. Input messages represent *intentions only*. Clients can never mutate HP, resource balances, unit counts, or victory states directly.
2. **Server Tier**: Fully AUTHORITATIVE. Executes `@ra4/sim-core`, validates all incoming commands via `@ra4/netcode`, ticks the simulation step-by-step, calculates checksums, and streams verified state updates back to clients.

### Flow 1: Authentication & Connection
1. Client calls `POST /api/v1/auth/login` or `/api/v1/auth/guest` -> Returns JWT Access & Refresh Tokens.
2. Client opens WebSocket `ws://<server>/ws` with JWT passed in query string or headers.
3. Server validates JWT, establishes session in Redis, and ties WebSocket socket to authenticated `userId` and `role`.

### Flow 2: Room & Matchmaking
1. Host creates room via WS `CREATE_ROOM` or joins matchmaking queue via `ENTER_QUEUE`.
2. Matchmaker matches players of comparable rating, allocates a `matchId` and random `seed`.
3. Server spawns an isolated `MatchRuntime` running an authoritative `@ra4/sim-core` instance.

### Flow 3: Authoritative 30 Hz Match Loop
1. Every 33.33ms (30 Hz), the `MatchRuntime` processes pending player commands.
2. Server validates entity ownership, resource cost, tech tier, cooldowns, fog of war, and distance.
3. Valid commands are pushed to `sim.processCommands()` and `sim.step()` is executed.
4. Server broadcasts `TICK_FRAME` containing tick index and validated commands.
5. Every 30 ticks (1s), server generates a full `STATE_SNAPSHOT` and checksum.

### Flow 4: Reconnect & Recovery
1. If WS connection breaks, client reconnects within the configured window (e.g. 60 seconds) sending `RECONNECT` with `matchId`, `playerIndex`, and `lastTick`.
2. Server verifies `reconnectToken`, fetches the latest `STATE_SNAPSHOT` from memory buffer, sends remaining tick commands since snapshot, and seamlessly restores client state.

---

## 3. Database Schema (PostgreSQL via Drizzle ORM)

### Tables
1. `users`: `id` (uuid, PK), `nickname` (unique), `email` (unique, nullable for guests), `password_hash`, `role` (`player` | `moderator` | `admin`), `is_banned` (boolean), `created_at`, `updated_at`.
2. `sessions`: `id` (uuid, PK), `user_id` (FK -> users), `refresh_token_hash`, `device_info`, `expires_at`, `created_at`.
3. `player_profiles`: `user_id` (PK, FK -> users), `matches_played`, `wins`, `losses`, `elo_rating`, `total_playtime_seconds`, `favorite_faction`, `created_at`, `updated_at`.
4. `player_settings`: `user_id` (PK, FK -> users), `volume_master`, `volume_sfx`, `volume_music`, `keybindings_json`, `updated_at`.
5. `bans`: `id` (uuid, PK), `user_id` (FK -> users), `banned_by` (FK -> users), `reason`, `expires_at`, `created_at`.
6. `audit_logs`: `id` (uuid, PK), `user_id` (FK -> users, nullable), `action`, `ip_address`, `details_json`, `created_at`.
7. `matches`: `id` (uuid, PK), `map_id`, `seed`, `duration_ticks`, `winner_team`, `finish_reason`, `created_at`, `finished_at`.
8. `match_players`: `id` (uuid, PK), `match_id` (FK -> matches), `user_id` (FK -> users), `player_index`, `faction_id`, `team`, `is_winner`.
9. `replays`: `id` (uuid, PK), `match_id` (FK -> matches), `content_version_hash`, `sim_core_version`, `replay_json`, `checksum_final`, `created_at`.

---

## 4. Redis Key Namespaces
- `session:<userId>:<sessionId>` -> Session metadata & active WS connection ID.
- `rate_limit:<ip>` -> Counter for rate limiting HTTP & WS connections.
- `matchmaking:queue:<region>:<mode>` -> Sorted set / list of queued players ordered by entry timestamp and rating.
- `room:<roomId>` -> Hash storing active room configuration, slot allocations, and ready states.
- `match:<matchId>:reconnect:<playerIndex>` -> Reconnect token and recovery payload buffer.

---

## 5. Security & Anti-Cheat Strategy
1. **Server Authority**: Client cannot dictate state changes.
2. **Command Validation**: Commands undergo multi-point sanity checks (`validatePlayerCommand`) before execution.
3. **Role Guards**: Admin commands (`spawn`, `give`, `fog`, `god`, `teleport`, `win`, `lose`) are strictly verified against the user's DB role (`admin`).
4. **Environment Isolation**: Admin cheats are completely disabled in public ranked/custom matches and allowed only in sandbox/dev modes.
5. **Rate Limiting & Flood Shield**: Max 20 commands per second per player connection. Excess commands trigger rate-limit warnings and security logging.
