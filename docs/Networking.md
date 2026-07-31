# Network Architecture & Command Protocol

## Overview
RA4 uses a **Lockstep Command Protocol** with Authoritative Server snapshot reconciliation over WebSocket.

## Message Types

### Client -> Server (`ClientMessage`)
- `JOIN_LOBBY`: Join a game room with player credentials.
- `SUBMIT_COMMAND`: Transmit a `PlayerCommand` (Move, Attack, Build, Ability).
- `CHECKSUM_REPORT`: Send calculated world checksum for tick verification.

### Server -> Client (`ServerMessage`)
- `LOBBY_STATE`: Broadcast player slot updates and map selections.
- `MATCH_START`: Transmit seed, tick rate, and initial world snapshot.
- `TICK_FRAME`: Scheduled stream of commands for the current tick frame.
- `STATE_SNAPSHOT`: Delta-compressed world snapshot for client sync & late-join.
- `CHECKSUM_MISMATCH`: Alert clients if out-of-sync checksum is detected.

## Anti-Cheat Protection
Every command is validated prior to tick execution:
1. **Entity Ownership**: Player can only issue commands to entities matching their `playerIndex`.
2. **Resource Bounds**: Building/unit production checks current credits and command cap.
3. **Map Boundaries**: Grid coordinate validations.
4. **Rate Limiting**: Maximum 100 entity IDs per command batch.
