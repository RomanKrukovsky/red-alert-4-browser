# Gameplay Asset Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the five approved GLB assets behave correctly in a live match while unsupported entities keep their current primitive fallback.

**Architecture:** Add a pure presentation-policy module and a Babylon-specific entity presenter between snapshot data and runtime asset instances. `RTSRenderer` delegates supported entity updates and transient shot effects to these focused units; `RuntimeAssetRegistry` continues to own loading and disposal.

**Tech Stack:** TypeScript 5.7, React 18, Babylon.js 7, Vitest 3, Playwright, pnpm.

## Global Constraints

- Do not modify deterministic `sim-core` behavior.
- Fully integrate only `SU_GranitMBT`, `SU_BogatyrOreCarrier`, `SU_RubezhRifleman`, `SU_HeavyFactory`, and `SU_Pillbox`.
- Unsupported entities must retain the existing diagnostic primitive fallback.
- Missing models, sockets, animations, or optional snapshot fields must not stop match loading.
- Keep imports at module tops and preserve unrelated working-tree changes.

---

### Task 1: Pure gameplay presentation policy

**Files:**
- Create: `apps/web-client/src/presentation/gameplayAssetPolicy.ts`
- Create: `apps/web-client/src/presentation/gameplayAssetPolicy.test.ts`

**Interfaces:**
- Produces: `SUPPORTED_GAMEPLAY_ASSET_IDS`, `GameplayAssetProfile`, `getGameplayAssetProfile(specId)`, `resolveAnimation(profile, moving, firing)`, `findNearestShooter(entities, shot, maximumDistance)`, and `normalizeCargo(currentOre, maximumOre)`.
- Consumes: the entity and shot shapes selected from `WorldSnapshot`.

- [ ] **Step 1: Write failing profile, animation, shot-association, and cargo tests**

Cover exact profile resolution for all five IDs, rejection of unknown IDs, `run → walk → idle` animation fallback order, nearest shooter selection inside a 2.5-world-unit threshold, rejection outside that threshold, and cargo clamping to `0..1`.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm exec vitest run apps/web-client/src/presentation/gameplayAssetPolicy.test.ts`

Expected: FAIL because `gameplayAssetPolicy.ts` does not exist.

- [ ] **Step 3: Implement immutable profiles and pure helpers**

Profiles must define `scale`, `rotationOffset`, `groundOffset`, `selectionDiameter`, animation aliases, optional `muzzle`, `turretYaw`, `oreFillAnchor`, `unloadSocket`, `exitPoint`, and fallback muzzle offset. The resolver returns `undefined` for every unsupported ID.

- [ ] **Step 4: Run tests and verify pass**

Run: `pnpm exec vitest run apps/web-client/src/presentation/gameplayAssetPolicy.test.ts`

Expected: all policy tests pass.

### Task 2: Runtime asset instance ownership metadata

**Files:**
- Modify: `apps/web-client/src/assets/RuntimeAssetRegistry.ts`

**Interfaces:**
- Consumes: `RuntimeAssetDefinition` and Babylon instantiated nodes.
- Produces: `RuntimeAssetInstance.visibleMeshes`, recursive socket lookup, disabled collision proxies, and entity metadata-ready visible meshes.

- [ ] **Step 1: Extend the runtime instance contract**

Expose the base visible meshes as `visibleMeshes: Mesh[]`. Keep all LOD-only meshes non-pickable and collision proxies disabled.

- [ ] **Step 2: Make partial preload failures recoverable**

Load each manifest entry independently. Log one warning containing the asset ID and URL when loading fails, and keep other entries available.

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @ra4/web-client typecheck`

Expected: PASS.

### Task 3: Babylon entity gameplay presenter

**Files:**
- Create: `apps/web-client/src/presentation/GameplayAssetPresenter.ts`

**Interfaces:**
- Consumes: `Scene`, `RuntimeAssetInstance`, `GameplayAssetProfile`, snapshot entity data, and matched shot targets.
- Produces: `create(entityId, profile, instance)`, `update(entity, shotTarget?)`, `getMuzzleWorldPosition()`, `setSelected(selected)`, and `dispose()`.

- [ ] **Step 1: Implement transform and ownership setup**

Apply scale, ground offset, and rotation correction. Put `{ entityId, specId }` metadata on every visible mesh so picking resolves the imported model to its simulation entity.

- [ ] **Step 2: Implement animation state transitions**

Only restart an animation when the logical state changes. Use mapped fire, run/walk, and idle names. Stop previous groups before starting the next group.

- [ ] **Step 3: Implement turret aiming and socket fallbacks**

Convert the target point into the turret parent's local space and update yaw without changing the entity root. Return the muzzle socket world position; if absent, transform the profile fallback offset by the entity root.

- [ ] **Step 4: Implement Bogatyr cargo feedback**

Create one non-pickable ore-fill mesh under `OreFillAnchor`. Scale and reveal it from normalized snapshot ore. Emit a short unloading particle or emissive pulse only when ore decreases while stationary.

- [ ] **Step 5: Implement factory production feedback**

Create a restrained emissive bay light at `ExitPoint`. Enable it only when a queue item belongs to that producer. Do not alter production timing or spawned positions.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @ra4/web-client typecheck`

Expected: PASS.

### Task 4: Renderer integration and socket-based combat effects

**Files:**
- Modify: `apps/web-client/src/renderer.ts`

**Interfaces:**
- Consumes: policy helpers, `GameplayAssetPresenter`, `WorldSnapshot.entities`, `WorldSnapshot.productionQueues`, and `WorldSnapshot.shotFX`.
- Produces: supported-model presenters keyed by entity ID, primitive fallbacks for unsupported IDs, and muzzle-correct transient effects.

- [ ] **Step 1: Delegate supported entity lifecycle**

When a supported profile and runtime asset both exist, create a presenter and update it every snapshot. Otherwise retain the current box/cylinder creation path.

- [ ] **Step 2: Replace generic selection sizing**

Use the profile selection diameter for the five supported models and preserve current default sizes for fallbacks. Keep rings aligned to the entity world position.

- [ ] **Step 3: Associate shots and emit socket effects**

Match every shot to the nearest supported combat entity. Aim its turret, trigger its fire animation, and start tracer/flash at its muzzle position. Use the original shot start when no safe association exists.

- [ ] **Step 4: Connect queue and ore data without sim changes**

Pass entity ore values and producer queue activity to presenters using only existing snapshot fields.

- [ ] **Step 5: Dispose presenters and listeners exactly once**

On entity removal or renderer disposal, stop animations/effects, dispose presenter-owned meshes, then dispose the runtime asset instance.

- [ ] **Step 6: Run typecheck and policy tests**

Run: `pnpm --filter @ra4/web-client typecheck && pnpm exec vitest run apps/web-client/src/presentation/gameplayAssetPolicy.test.ts`

Expected: PASS.

### Task 5: Live-match verification

**Files:**
- Modify if required by discovered defect: `apps/web-client/src/presentation/GameplayAssetPresenter.ts`
- Modify if required by discovered defect: `apps/web-client/src/renderer.ts`
- Update: `ASSET_PIPELINE_REPORT.md`

**Interfaces:**
- Consumes: running Vite client and existing admin spawn command.
- Produces: evidence that all five models load, move/select/fire where applicable, and unsupported entities retain fallback rendering.

- [ ] **Step 1: Run static and deterministic checks**

Run: `pnpm assets:verify && pnpm --filter @ra4/web-client typecheck && pnpm test:determinism`

Expected: 23 GLBs verified, typecheck passes, and the 10,000-tick checksum remains deterministic.

- [ ] **Step 2: Run browser smoke test**

Open `#/hud/soviet`, wait for a live snapshot, inspect console errors, and capture the canvas. Verify real-model mesh names for the five supported IDs and primitive names for an unsupported ID.

- [ ] **Step 3: Exercise gallery and LOD controls**

Open `#/asset-gallery`, select every supported asset, switch available LODs, toggle wireframe and bounds, and verify there are no loading errors.

- [ ] **Step 4: Record measured results**

Append the browser result, policy-test result, typecheck result, determinism checksum, and known visual limitations to `ASSET_PIPELINE_REPORT.md`.

- [ ] **Step 5: Commit implementation**

Stage only the files in this plan and commit with `feat: integrate runtime assets with gameplay`.
