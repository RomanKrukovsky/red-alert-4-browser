# Deterministic Simulation Core (`packages/sim-core`)

## Overview
The simulation engine runs at a fixed **30 Hz tick rate** (33.33ms per step).

## Scaled Integer Math (`fixedMath.ts`)
To prevent cross-platform IEEE 754 floating-point non-determinism, all spatial coordinates, distances, speeds, damages, armor multipliers, and resource values are computed using scaled integers (`SCALE_FACTOR = 1000`).

## Faction Mechanics Implementation
1. **USSR**: Mobilization Resource (0-100), heavy armor multipliers, cheap mass infantry.
2. **Alliance**: Intelligence Resource (0-100), high shield capacities, air superiority weapons.
3. **Oriental Coalition**: Synchronization Resource (0-100), nanite self-healing, shield pylon networks.
4. **Chronolegion**: Temporal Stability (0-100), phase-shift abilities, instant blink harvesters.

## World Checksum
Calculated every tick by hashing tick index, PRNG state, entity IDs, positions, HP, and resource values:
```ts
hash = ((hash << 5) - hash) + e.id + e.x + e.y + e.hp + e.currentOre;
```
