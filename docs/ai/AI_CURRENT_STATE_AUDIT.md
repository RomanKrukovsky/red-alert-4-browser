# Red Alert 4: AI Engine Current State Audit

**Audit Date**: August 1, 2026  
**Auditor**: Principal RTS AI Architect  
**Scope**: `packages/sim-core/src/aiAgent.ts` & Sim-Core Integration  

---

## 1. Executive Summary & Capabilities Assessment

The current AI implementation consists of a single monolithic script (`SkirmishAIAgent` in `packages/sim-core/src/aiAgent.ts`). While functional for basic vertical slice demonstrations, it is a minimal heuristic script rather than an industrial-grade RTS AI engine.

### Current Capabilities:
- **Decision Loop**: Evaluates hardcoded rules once every 30 ticks (1.0 second at 30 Hz).
- **Power Management**: Builds a thermal power plant / fission reactor when `powerLow` is active and credits >= 800.
- **Economic Expansion**: Builds a single refinery if no refinery exists and credits >= 2000.
- **Factory Construction**: Builds a heavy factory if refinery exists, no factory exists, and credits >= 2000.
- **Unit Recruitment**: Queues single MBTs (`SU_GranitMBT` or `AL_BulwarkMBT`) if factory queue length < 2 and credits >= 1200.
- **Attack Wave Dispatch**: Issues a primitive `MOVE` command to all combat units toward an enemy HQ when army size reaches >= 3 units.

---

## 2. Identified Deficiencies & Architectural Violations

| Category | Description / Finding | Severity |
| :--- | :--- | :--- |
| **Fog of War Violation** | AI inspects `sim.entities` globally to find the exact coordinates of enemy buildings without scouting or line of sight. | **CRITICAL** |
| **Static Placement** | Hardcoded grid coordinates (`45, 45`, `48, 42`, `52, 48`) used for building placement without space validation or obstacle detection. | **HIGH** |
| **No Harvester Recovery** | Does not check or rebuild destroyed harvesters; economy halts permanently if harvesters are lost. | **HIGH** |
| **No Tactical Micro & Retreat** | Units move in straight lines without formation offsets, target prioritization, kiting, or damaged unit retreat. | **HIGH** |
| **No Threat Map & Scouting** | Lacks spatial threat assessment, terrain control maps, and intelligence decay memory. | **HIGH** |
| **Monolithic Single File** | Lacks layer separation (Director, Intelligence, Economy, Base Planner, Production, Operations, Army Groups, Tactical, Micro). | **MEDIUM** |
| **No Difficulty / Personalities** | Uniform behavior across all matches; lacks Aggressive, Defensive, Economic, Raider, or Adaptive profiles. | **MEDIUM** |
| **No Self-Play / Benchmarks** | No automated harness for running 100+ headless games with win-rate statistics. | **MEDIUM** |

---

## 3. Mandatory Remediation & 10-Stage Target Architecture

1. **Stage 1**: Blackboard, Intelligence World Model (Scouted FOW Memory), AI Scheduler.
2. **Stage 2**: Economy Manager, Harvester Management, Ore Field Assessment, Economic Recovery.
3. **Stage 3**: Spatial Base Planner, Placement Grid Search, Power Grid expansion, Chokepoint Defense.
4. **Stage 4**: Production Manager, Dynamic Army Composition (Anti-Armor, Anti-Infantry, Artillery).
5. **Stage 5**: Intelligence Decay, Threat Maps (UAV/Scout patrol, enemy composition counter).
6. **Stage 6**: Army Group Manager (Base Defense, Harvester Guard, Main Strike Force, Quick Response).
7. **Stage 7**: Strategic Operations & Mission Phasing (Opening, Expansion, Midgame, Pressure, Recovery, Endgame).
8. **Stage 8**: Tactical Controller, Target Evaluation Function, AttackMove & Formation Kiting.
9. **Stage 9**: Personalities (Aggressive, Defensive, Economic, Adaptive, Raider) & Difficulty Levels (Easy, Normal, Hard, Hard Fair).
10. **Stage 10**: Self-Play Benchmark Harness, 100-match automated testing, Determinism verification, and Performance profiling.
