# Runtime Asset Report

Generated: 2026-08-01

- Runtime GLB files: 23
- Runtime GLB payload: 3.85 MiB
- Approved CC0 entries: 14
- Sketchfab entries blocked by OAuth: 5
- Validation: GLB 2.0, socket names, embedded-resource safety and LOD triangle order checked by `pnpm assets:verify`.
- Known gap: Rubezh has LOD0 only; safe skinned retopology remains pending.

## Gameplay integration verification

- Five approved `specId` values use dedicated presentation profiles; unsupported entities retain primitive fallback rendering.
- Runtime picking resolves imported child meshes through entity metadata.
- Granit and Pillbox turrets track their snapshot targets; muzzle effects use the `Muzzle` socket when a shot can be associated safely.
- Because the current simulation snapshot does not emit `shotFX`, the presentation layer also infers one visual shot when a target loses HP. This does not modify simulation state.
- Rubezh switches between idle, movement, and fire animation groups without restarting the same group every snapshot.
- Bogatyr cargo fill is driven by `currentOre / maxOre`; decreasing cargo while stationary triggers a short unload pulse.
- Heavy Factory production activity is driven by its existing `productionQueue`.
- Browser smoke test: all five assets and every available LOD loaded with HTTP 200; clicking an imported Bogatyr child mesh selected `SU_BogatyrOreCarrier`; no console or page errors.
- Asset Gallery measurements: Granit LOD2 1,664 tris; Bogatyr LOD2 2,890 tris; Rubezh LOD0 8,806 tris and 24 animations; Factory LOD2 731 tris; Pillbox LOD2 152 tris.
- Policy tests: 4 passed. Web client typecheck: passed. Asset verification: 23 GLBs passed. Determinism: 10,000 ticks passed, checksum `1018642221`.
