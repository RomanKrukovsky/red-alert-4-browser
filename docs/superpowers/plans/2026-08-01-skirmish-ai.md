# Skirmish AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить честный, детерминированный и измеряемый AI Альянса для схватки против СССР, а затем расширить общую архитектуру без копирования логики по фракциям.

**Architecture:** `SkirmishAIAgent` становится тонким контейнером Blackboard и независимых менеджеров. Все наблюдения проходят через team-aware Fog of War, все действия — через единый валидируемый путь `PlayerCommand`, а дорогая работа распределяется детерминированным scheduler. Каждый этап остаётся рабочим и получает отдельный коммит.

**Tech Stack:** TypeScript 5.7, `packages/sim-core`, `@ra4/shared-types`, `@ra4/content-runtime`, headless Node tests, pnpm/turbo.

## Global Constraints

- Авторитетная симуляция работает на фиксированных 30 Hz и не зависит от браузера.
- Запрещены `Math.random`, системное время и чтение скрытого состояния противника.
- Hard Fair не получает скрытых ресурсов, видимости или бесплатных единиц.
- Импорты находятся в начале модулей; `switch` по enum/discriminated union содержит `never`-проверку.
- AI не меняет сущности, деньги, урон, пути или очереди напрямую.
- Вертикальный срез ограничен Альянсом против СССР, наземной экономикой, пехотой и танками.

---

### Task 1: Audit, Blackboard, visible World Model and Scheduler

**Files:**
- Create: `docs/ai/AI_CURRENT_STATE_AUDIT.md`
- Create: `packages/sim-core/src/ai/types.ts`
- Create: `packages/sim-core/src/ai/blackboard.ts`
- Create: `packages/sim-core/src/ai/worldModel.ts`
- Create: `packages/sim-core/src/ai/scheduler.ts`
- Create: `packages/testing/src/aiStage1.test.ts`
- Modify: `packages/sim-core/src/aiAgent.ts`, `packages/sim-core/src/index.ts`, `packages/testing/package.json`

**Interfaces:**
- Produces `AIBlackboard`, `AIWorldModel.updateVisibleEnemies()`, `AIScheduler.isDue()` and profiling counters used by every later manager.

- [ ] Write a headless test proving scheduler staggering, confidence decay, deletion of stale memory and absence of hidden entities.
- [ ] Run the Stage 1 test and confirm it fails because the new modules do not exist.
- [ ] Implement immutable AI configuration, Blackboard state, stable entity-id ordering and integer confidence decay.
- [ ] Integrate observation before legacy decisions without exposing hidden enemies through Blackboard.
- [ ] Run build, content validation, AI and determinism tests.
- [ ] Commit only Stage 1 files as `feat(ai): add deterministic blackboard world model and scheduler`.

### Task 2: Economy Manager and Recovery

**Files:**
- Create: `packages/sim-core/src/ai/economyManager.ts`
- Create: `packages/testing/src/aiEconomy.test.ts`
- Modify: `packages/sim-core/src/aiAgent.ts`, command validation and testing scripts.

**Interfaces:**
- Consumes Blackboard-owned entities, resource nodes and faction content.
- Produces only `GATHER`, `DEPOSIT_ORE` and validated `PRODUCE_UNIT` commands plus reason codes.

- [ ] Test normal harvesting, lost-harvester recovery, zero-income transition and reserve protection.
- [ ] Add income samples and deterministic field scoring by distance, danger and remaining ore.
- [ ] Produce a harvester only through a compatible factory and regular cost/cap checks.
- [ ] Enter Recovery when income, harvester or production prerequisites are missing.
- [ ] Verify economy, AI and determinism suites; commit Stage 2.

### Task 3: Shared placement validation and Base Planner

**Files:**
- Create: `packages/sim-core/src/buildingPlacement.ts`
- Create: `packages/sim-core/src/ai/basePlanner.ts`
- Create: `packages/testing/src/aiBasePlanner.test.ts`
- Modify: `packages/sim-core/src/simulation.ts`, AI composition and test scripts.

**Interfaces:**
- Produces one `validateBuildingPlacement()` used by humans and AI, plus bounded spiral candidate search.

- [ ] Test bounds, overlap, passability, faction, prerequisites, build radius and alternative placement.
- [ ] Make `BUILD_STRUCTURE` reject invalid positions before charging credits.
- [ ] Score reactor, refinery, barracks and factory positions relative to HQ, ore, exits and occupied cells.
- [ ] Limit attempts and back off failed plans; detect power deficit and rebuild production chain.
- [ ] Verify building, AI, determinism and replay; commit Stage 3.

### Task 4: Validated Production Manager and army roles

**Files:**
- Create: `packages/sim-core/src/ai/productionManager.ts`
- Create: `packages/sim-core/src/ai/unitRoles.ts`
- Create: `packages/testing/src/aiProduction.test.ts`
- Modify: production command handling and AI composition.

**Interfaces:**
- Produces scored `PRODUCE_UNIT` commands from visible counters, phase, reserves and queue state.

- [ ] Test producer/category/faction/prerequisite validation and command-cap handling.
- [ ] Define roles for the Alliance vertical-slice units and balanced fallback ratios.
- [ ] Smooth enemy composition observations so a single sighting cannot instantly counter-production.
- [ ] Prevent one-unit spam with target ratios and queue-aware deficits.
- [ ] Verify production invariants and determinism; commit Stage 4.

### Task 5: Fog of War, scouting and intelligence memory

**Files:**
- Create: `packages/sim-core/src/ai/scoutManager.ts`
- Create: `packages/testing/src/aiFogOfWar.test.ts`
- Modify: `fogOfWar.ts`, `simulation.ts`, combat targeting and replay checksum.

**Interfaces:**
- Produces visible entity views, last-known contacts, uncertainty sectors and scout commands.

- [ ] Test visibility refresh from sight ranges and stable explored/visible transitions.
- [ ] Prevent `ATTACK` and auto-target acquisition against hidden entities.
- [ ] Add scout sector selection from uncertainty without reading hidden entities.
- [ ] Include Fog state and AI memory in determinism/replay verification.
- [ ] Verify hidden-data invariants; commit Stage 5.

### Task 6: Army groups, base defense and quick response

**Files:**
- Create: `packages/sim-core/src/ai/armyGroupManager.ts`
- Create: `packages/sim-core/src/ai/defenseManager.ts`
- Create: `packages/testing/src/aiDefense.test.ts`

**Interfaces:**
- Produces exclusive group membership for base defense, economy defense, reserve, scout and response groups.

- [ ] Test exclusive ownership, destroyed-unit cleanup and reassignment.
- [ ] Detect visible threats and recent damage near HQ/refinery.
- [ ] Form a bounded response group and return it after threat expiry.
- [ ] Verify defense scenarios and command ownership invariants; commit Stage 6.

### Task 7: Strategic Operations and attack waves

**Files:**
- Create: `packages/sim-core/src/ai/operations.ts`
- Create: `packages/sim-core/src/ai/director.ts`
- Create: `packages/testing/src/aiOperations.test.ts`

**Interfaces:**
- Produces timed operations with priority, force value, rally point, target contact, progress and cancellation reason.

- [ ] Test phase transitions from economy, losses, army value and threat instead of time alone.
- [ ] Build attack waves only after rally and minimum force requirements.
- [ ] Target only visible or remembered positions, preferring exposed economy for raid operations.
- [ ] Cancel or retarget operations after timeout/no progress while preserving unrelated objectives.
- [ ] Verify attack and infinite-operation scenarios; commit Stage 7.

### Task 8: Tactical Controller and bounded micro

**Files:**
- Create: `packages/sim-core/src/ai/tacticalController.ts`
- Create: `packages/sim-core/src/ai/targetScoring.ts`
- Create: `packages/testing/src/aiTactics.test.ts`
- Modify: `ATTACK_MOVE` execution and team-aware combat validation.

**Interfaces:**
- Produces rate-limited group `ATTACK`, `ATTACK_MOVE`, `MOVE` and `STOP` commands.

- [ ] Test target scoring over threat, value, vulnerability, distance and operation goal.
- [ ] Test retreat on losing local force ratio and leash against endless pursuit.
- [ ] Add formation destinations and stable tie-breaks by entity id.
- [ ] Enforce one compatible command per unit per tick.
- [ ] Verify tactical scenarios, mass combat and determinism; commit Stage 8.

### Task 9: Personalities, difficulty and decision journal

**Files:**
- Create: `packages/sim-core/src/ai/config.ts`
- Create: `packages/sim-core/src/ai/decisionLog.ts`
- Create: `packages/testing/src/aiPersonality.test.ts`
- Modify: player AI configuration and development snapshot/debug adapter.

**Interfaces:**
- Produces config-only Aggressive, Defensive, Economic, Adaptive and Raider profiles; Easy, Normal, Hard, Hard Fair and explicit optional Brutal bonus.

- [ ] Test that personalities change operation/ratio statistics under identical observations.
- [ ] Test difficulty changes intervals, memory, errors and reaction delay without hidden vision.
- [ ] Add bounded deterministic reason log and non-authoritative timing telemetry.
- [ ] Expose development-only overlay data without changing checksum or decisions.
- [ ] Verify personality and determinism suites; commit Stage 9.

### Task 10: Self-play, benchmark and balance gates

**Files:**
- Create: `packages/testing/src/aiScenarios.test.ts`
- Create: `packages/testing/src/aiSelfPlay.test.ts`
- Create: `packages/testing/src/aiInvariants.test.ts`
- Create: `packages/testing/src/aiBenchmark.ts`
- Modify: root and testing package scripts, AI defaults and performance documentation.

**Interfaces:**
- Produces machine-readable match metrics and non-zero exit codes on correctness or performance gate failure.

- [ ] Encode all 18 required scenarios with fixed seeds and explicit tick deadlines.
- [ ] Run 100 parallel logical headless matches without browser state and record completion/failure.
- [ ] Add replay equality and command/property invariants.
- [ ] Collect win rate, timings, economy/attack milestones, command rejection and stuck-group metrics.
- [ ] Balance across multiple seeds on Красный Рубеж without seed-specific branches.
- [ ] Run full build/content/AI/determinism/replay/scenario/self-play/benchmark matrix; commit Stage 10.

## Self-review

Все требования исходного задания распределены по этапам. До Stage 5 нельзя заявлять полное соблюдение Fog of War; до Stage 8 — полноценную тактику; до Stage 10 — статистически подтверждённую силу или производительность. Каждый этап имеет отдельный наблюдаемый результат и отдельный набор тестов.
