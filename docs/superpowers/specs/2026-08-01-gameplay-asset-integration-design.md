# Gameplay Asset Integration Design

Date: 2026-08-01

## Goal

Correctly integrate the five approved runtime models into gameplay without changing `sim-core`:

- `SU_GranitMBT`
- `SU_BogatyrOreCarrier`
- `SU_RubezhRifleman`
- `SU_HeavyFactory`
- `SU_Pillbox`

All other entity specifications continue to use the existing diagnostic primitive fallback.

## Boundaries

The implementation is presentation-only. It reads `WorldSnapshot` and never writes gameplay state or changes deterministic simulation behavior.

The renderer must remain operational when a model, animation, socket, or optional snapshot field is unavailable. Missing visual data produces a warning and uses a safe fallback; it must not stop the match.

## Architecture

Introduce a gameplay presentation adapter between `RTSRenderer` and `RuntimeAssetRegistry`.

The registry remains responsible for loading, instantiating, LOD setup, socket discovery, shadows, and disposal. The adapter is responsible for interpreting a snapshot entity as a visual state and applying that state to a runtime instance.

The adapter exposes three operations:

1. Create presentation state for a supported `specId`.
2. Update transform, animation, turret direction, cargo display, production display, and selection anchors from the latest snapshot.
3. Dispose presentation state after the entity disappears.

`RTSRenderer` remains responsible for the scene, terrain, snapshot loop, selection indicators, and transient effects.

## Shared Transform Rules

Each supported model receives an explicit presentation profile containing:

- uniform runtime scale;
- forward-axis correction;
- ground offset;
- selection-ring size;
- optional turret and gameplay socket names.

The profile is presentation data, separate from the source asset manifest. This prevents Blender source dimensions from leaking into simulation coordinates.

Entity movement follows snapshot position and rotation. Visual interpolation may smooth between snapshots, but it must never feed a value back into the simulation.

## Unit Behavior

### Granit

- Use the real vehicle root and offline LODs.
- Apply corrected scale and forward direction.
- Rotate `TurretYaw` toward the current shot target when a matching shot effect is observed.
- Start tracer and muzzle flash from the world position of `Muzzle`.
- Use the vehicle movement animation while moving when available.

### Rubezh

- Use `Idle_Gun` or `Idle` while stationary.
- Use `Run`, falling back to `Walk`, while moving.
- Play the fire animation when a matching shot is observed.
- Keep hit and death mappings available, but only trigger them when the current snapshot exposes enough information to detect those transitions reliably.
- Do not synthesize gameplay death timing inside the visual layer.

### Bogatyr

- Use vehicle movement behavior and corrected scale.
- Represent current ore as a bounded fill indicator attached to `OreFillAnchor`.
- Show unloading feedback near `UnloadSocket` when the visible ore amount decreases while the carrier is stationary near an owned drop-off structure.
- If ore fields are absent from the snapshot, keep the cargo indicator hidden.

## Building Behavior

### Heavy Factory

- Apply explicit building scale, footprint-aligned ground offset, and selection size.
- Use `ExitPoint` as the visual production exit reference.
- Show restrained production activity when the snapshot production queue is associated with this building.
- Production effects are visual only and do not alter spawn position or timing.

### Pillbox

- Apply building transform and selection rules.
- Rotate `TurretYaw` toward the current shot target.
- Emit muzzle flash and tracer from `Muzzle`.

## Shot Association

The current `shotFX` records contain positions but no shooter entity ID. The renderer associates a shot with the nearest supported combat entity to the shot start position within a strict distance threshold.

If no safe match exists, the existing world-space tracer is used. This avoids incorrect turret movement or muzzle flashes.

Every shot effect is processed once. The visual layer uses its own short-lived identity derived from snapshot order and coordinates; this identity does not enter simulation state.

## Selection, Picking, and UI Anchors

Imported visible meshes remain pickable and resolve to the owning entity ID through metadata. Collision proxies remain disabled for rendering and picking.

Selection rings use profile-specific sizes. Health and selection anchors are exposed to future world-space UI, but this pass does not replace the existing HUD.

## Error Handling

- Failed model load: keep match loading alive and use primitive fallback for the affected specification.
- Missing socket: use entity position plus a profile-defined fallback offset.
- Missing animation: preserve the current pose or use the next mapped fallback.
- Unsupported entity: use the existing primitive path.
- Disposed entity: stop animations and effects, remove selection visuals, then dispose its runtime instance exactly once.

## Testing

Automated tests cover:

- supported and unsupported `specId` resolution;
- profile scale, orientation, and selection values;
- movement animation selection;
- nearest-shooter association and distance rejection;
- cargo fill normalization and unloading transition detection;
- safe behavior for missing sockets and animations.

Browser smoke tests cover:

- spawning all five supported entities;
- movement of Granit, Bogatyr, and Rubezh;
- firing from Granit, Rubezh, and Pillbox;
- selection and picking;
- production activity at the factory;
- camera-distance LOD changes;
- absence of console errors during creation and destruction.

The existing TypeScript build, asset verification, and 10,000-tick determinism test must continue to pass.

## Completion Criteria

- The five supported entities display their real GLB models in a live match.
- Their scale, orientation, ground placement, selection, animations, and relevant sockets behave consistently.
- Shot effects originate from muzzle sockets when association is reliable.
- Bogatyr cargo and factory production receive snapshot-driven visual feedback when required data is present.
- Unsupported entities retain their current fallback appearance.
- No changes are made to deterministic simulation behavior.
