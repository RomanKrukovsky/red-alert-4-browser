# Skirmish AI Architecture

## Fair Fog of War Vision
The Skirmish AI (`PlayerType.AI_EASY`, `AI_MEDIUM`, `AI_HARD`) interacts with the game strictly through the `FogOfWarManager`. AI units can only target enemy units and buildings currently visible within their team's explored vision range.

## AI Decision Tree
1. **Economy First**: Maintain minimum 1 Refinery per 2 factories.
2. **Expansion**: Expand harvesters to nearby resource nodes.
3. **Tech Progression**: Upgrade to T2 and build Radar/Tech facilities when credits exceed 3,000.
4. **Army Composition**: Maintain balanced counter-composition (Infantry, Tanks, Artillery, Air).
