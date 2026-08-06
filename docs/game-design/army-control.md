# Army Control: Stances and Standing Orders

**Updated:** 2026-08-06

Covers §9 (army control) for the order/stance half. Selection, control groups
and formations live in the input layer; this document is about simulation
behavior, which is what determines whether an order is real or cosmetic.

## Model

Two independent pieces of per-entity state:

| State | Values | Meaning |
|---|---|---|
| `stance` | `AGGRESSIVE` (default), `DEFENSIVE`, `HOLD_FIRE` | how the entity reacts to enemies *without* an explicit order |
| `orderMode` | `NONE`, `HOLD`, `PATROL`, `GUARD`, `ATTACK_MOVE` | what it is currently *doing* |

Stance is a persistent preference: it survives `STOP` and new movement orders.
Order mode is replaced by any new movement/attack order.

## Behavior

**STOP** — cancels movement, target, waypoints and any standing order;
stance is kept. The unit stays where it is.

**HOLD** — anchors the unit at its current position (`postX/postY`). It still
fires at anything that comes into weapon range, but never travels: pursuit is
refused even when a target is visible and out of range.

**PATROL** — a route of waypoints, cycled forever. A single order creates a
two-leg route (current position ↔ target), so one click already produces a
real back-and-forth patrol. `append: true` (Shift-click) extends the route.
Combat suspends travel; when the fight ends, the current leg is re-issued.

**GUARD** — either an entity (follows it, post tracks its position) or a fixed
point. A leash of 6 tiles bounds how far the guard may be pulled: beyond it the
chase is abandoned and the unit returns to its post. If the guarded entity
dies, the order reverts to idle rather than guarding a ghost.

**Stances** — `DEFENSIVE` fights from where it stands (no pursuit, like HOLD
but without pinning a post). `HOLD_FIRE` never auto-acquires; only an explicit
`ATTACK` order makes it fire.

## Target acquisition

Two stages, in this order:

1. scan within **weapon range** — the common case in a fight;
2. only if nothing is shootable, and the unit is not anchored, widen to
   **sight range** so it can close on an enemy it can see but not yet hit.

This is what makes "pursue" distinguishable from "already in range": before,
acquisition used weapon range only, so a unit with a shorter gun than its eyes
(18 of 28 armed units in the content DB) would simply ignore a visible enemy.
Fog of war is not bypassed — `sightRange` is exactly that entity's own vision.

Firing remains gated on weapon range. Pursuit is additionally gated by order
mode and stance (`HOLD`/`DEFENSIVE` never pursue; `GUARD` only within leash).

## Determinism

- The standing-order pass runs once per tick over `this.entities` in insertion
  order (ids are allocated deterministically), reads only simulation state,
  and uses no wall clock or unseeded randomness.
- Multi-entity orders sort by entity id before applying, so the same command
  produces the same result regardless of `entityIds` ordering.
- **The checksum covers order state**: `orderMode`, `stance`, `patrolIndex`,
  the full patrol route, `postX/postY`, `guardEntityId`. Two clients
  disagreeing about a patrol leg would otherwise desync undetected. A test
  asserts the checksum actually changes when an order is issued.

## Protocol

`PATROL` carries `append`; `GUARD` carries an optional entity **and** an
optional point; `SET_STANCE` is command tag 18. All 18 command types
round-trip value-exact through the binary codec (`pnpm test:protocol-v1`).

## Tests (`pnpm test:stances`, in `test:ci`)

23 checks, including the contrasts that distinguish real behavior from a no-op:

- STOP halts a moving unit (travelled > 500 ⇒ drift 0 afterwards).
- HOLD does not pursue a *visible, out-of-range* enemy (moved 0) while the same
  unit on AGGRESSIVE closes 9000 units — the control that proves HOLD is doing
  something. DEFENSIVE likewise holds ground.
- HOLD still damages an enemy that is within range (pinned ≠ pacifist).
- HOLD_FIRE takes no shot at all, but obeys an explicit ATTACK order.
- PATROL reaches the far waypoint and returns toward the origin; `append`
  yields a 3-leg route.
- GUARD follows a moving VIP; stays within leash despite a distant enemy;
  reverts to idle when the guarded entity dies.
- A new MOVE cancels a standing PATROL and the unit goes to the new target.
- Determinism: identical checksum across runs with mixed standing orders.

Test-authoring notes worth keeping: assertions must use **effective health**
(`hp + shield`) because Alliance vehicles carry a 300-point shield that
absorbs the first hits, and "out of range" must exceed the *weapon* range of
the specific unit under test (a tank at 2000 units is already in range).

## Performance of two-stage acquisition

The wider (sight-range) scan looked like a cost risk, and a first wall-clock
reading suggested p95 had regressed 5.6 → 8.9 ms. That reading was machine
contention (load average 24–120; the same build varied >10× between runs). Two
load-immune measurements settled it:

- **Deterministic grid-visit count**, normalised per entity-tick:
  **183.8 (new) vs 301.6 (old) — 39% less work.**
- **Interleaved A/B** (both builds stepped alternately in one process, so load
  affects them equally): new build faster at every percentile, stable across
  three runs — p50 ≈1.8×, p95 ≈1.7×.

The reason is behavioural: units now acquire and close in decisively instead of
idling within sight of an enemy and re-scanning every 5 ticks. The engagement
resolves sooner, so total work drops even though each scan can be wider.

Method details are in `docs/architecture/simulation.md` § Measuring under
machine contention. Absolute percentiles still need a re-take on an idle
machine, but the no-regression verdict does not depend on that.
