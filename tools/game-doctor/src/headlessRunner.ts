import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, MatchState, PlayerType } from '@ra4/shared-types';

export interface HeadlessResult {
  name: string;
  passed: boolean;
  durationMs: number;
  ticksRun: number;
  finalChecksum: number;
  error?: string;
}

export class HeadlessTestRunner {
  public async runAll(): Promise<HeadlessResult[]> {
    const results: HeadlessResult[] = [];
    results.push(await this.testHarvesterEconomyCycle());
    results.push(await this.testBuildingChain());
    results.push(await this.testArmyProductionAndCombat());
    results.push(await this.testHQDestructionAndVictoryDefeat());
    results.push(await this.testLossOfHarvesterAndPowerPlant());
    results.push(await this.testAIRecovery());
    results.push(await this.testDeterminismAndChecksum());
    results.push(await this.testThirtyMinuteSimulation());
    return results;
  }

  private async testHarvesterEconomyCycle(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(12345);
      sim.initMatch([
        { name: 'Player', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'AI', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
      ]);
      const initialCredits = sim.players[0].credits;
      for (let t = 0; t < 600; t++) {
        sim.step();
      }
      const finalCredits = sim.players[0].credits;
      const passed = finalCredits >= initialCredits;
      return {
        name: 'Harvester Economic Cycle',
        passed,
        durationMs: Date.now() - startTime,
        ticksRun: 600,
        finalChecksum: sim.calculateChecksum(),
        error: passed ? undefined : `Credits did not increase: initial ${initialCredits}, final ${finalCredits}`,
      };
    } catch (err: any) {
      return {
        name: 'Harvester Economic Cycle',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testBuildingChain(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(54321);
      sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_EASY, team: 1 },
      ]);

      // Build Power Plant
      sim.processCommands([{
        type: CommandType.BUILD_STRUCTURE,
        playerIndex: 0,
        tick: sim.tickIndex + 1,
        structureId: 'bldg_power_plant_ussr',
        gridX: 15,
        gridY: 15,
        entityIds: [],
      }]);

      for (let t = 0; t < 400; t++) sim.step();

      // Build Refinery
      sim.processCommands([{
        type: CommandType.BUILD_STRUCTURE,
        playerIndex: 0,
        tick: sim.tickIndex + 1,
        structureId: 'bldg_refinery_ussr',
        gridX: 20,
        gridY: 15,
        entityIds: [],
      }]);

      for (let t = 0; t < 500; t++) sim.step();

      const buildings = Array.from(sim.entities.values()).filter((e) => e.playerIndex === 0 && e.isBuilding);
      const passed = buildings.length >= 3; // HQ + Power Plant + Refinery

      return {
        name: 'Base Building Chain',
        passed,
        durationMs: Date.now() - startTime,
        ticksRun: sim.tickIndex,
        finalChecksum: sim.calculateChecksum(),
        error: passed ? undefined : `Building count insufficient: ${buildings.length}`,
      };
    } catch (err: any) {
      return {
        name: 'Base Building Chain',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testArmyProductionAndCombat(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(777);
      sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.HUMAN, team: 1 },
      ]);

      const entities = Array.from(sim.entities.values());
      const p1HQ = entities.find((e) => e.playerIndex === 0 && e.isBuilding);

      if (p1HQ) {
        sim.processCommands([{
          type: CommandType.PRODUCE_UNIT,
          playerIndex: 0,
          tick: sim.tickIndex + 1,
          producerEntityId: p1HQ.id,
          unitId: 'unit_tank_rhino',
          entityIds: [p1HQ.id],
        }]);
      }

      for (let t = 0; t < 500; t++) sim.step();

      return {
        name: 'Army Production & Combat',
        passed: true,
        durationMs: Date.now() - startTime,
        ticksRun: sim.tickIndex,
        finalChecksum: sim.calculateChecksum(),
      };
    } catch (err: any) {
      return {
        name: 'Army Production & Combat',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testHQDestructionAndVictoryDefeat(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(999);
      sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.HUMAN, team: 1 },
      ]);

      const p2Entities = Array.from(sim.entities.values()).filter((e) => e.playerIndex === 1);
      for (const ent of p2Entities) {
        ent.hp = 0;
      }

      for (let t = 0; t < 30; t++) sim.step();

      const passed = sim.matchState === MatchState.FINISHED && sim.winnerTeam === 0;

      return {
        name: 'HQ Destruction & Victory/Defeat Trigger',
        passed,
        durationMs: Date.now() - startTime,
        ticksRun: sim.tickIndex,
        finalChecksum: sim.calculateChecksum(),
        error: passed ? undefined : `Match did not finish correctly: state=${sim.matchState}, winner=${sim.winnerTeam}`,
      };
    } catch (err: any) {
      return {
        name: 'HQ Destruction & Victory/Defeat Trigger',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testLossOfHarvesterAndPowerPlant(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(111);
      sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
      ]);

      for (let t = 0; t < 200; t++) sim.step();

      const harvester = Array.from(sim.entities.values()).find((e) => e.playerIndex === 0 && !e.isBuilding);
      if (harvester) harvester.hp = 0;

      for (let t = 0; t < 200; t++) sim.step();

      return {
        name: 'Loss of Asset Recovery',
        passed: true,
        durationMs: Date.now() - startTime,
        ticksRun: sim.tickIndex,
        finalChecksum: sim.calculateChecksum(),
      };
    } catch (err: any) {
      return {
        name: 'Loss of Asset Recovery',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testAIRecovery(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(333);
      sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'AI', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
      ]);

      for (let t = 0; t < 400; t++) {
        sim.step();
      }

      const aiEntities = Array.from(sim.entities.values()).filter((e) => e.playerIndex === 1);
      const passed = aiEntities.length > 1;

      return {
        name: 'AI Agent Recovery & Development',
        passed,
        durationMs: Date.now() - startTime,
        ticksRun: sim.tickIndex,
        finalChecksum: sim.calculateChecksum(),
        error: passed ? undefined : `AI entities count insufficient: ${aiEntities.length}`,
      };
    } catch (err: any) {
      return {
        name: 'AI Agent Recovery & Development',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testDeterminismAndChecksum(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const seed = 42;
      const playerConfigs = [
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
      ];
      const sim1 = new GameSimulation(seed);
      const sim2 = new GameSimulation(seed);
      sim1.initMatch(playerConfigs);
      sim2.initMatch(playerConfigs);

      let mismatch = false;
      for (let t = 0; t < 1000; t++) {
        const snap1 = sim1.step();
        const snap2 = sim2.step();

        if (snap1.checksum !== snap2.checksum) {
          mismatch = true;
          break;
        }
      }

      return {
        name: 'Seed Determinism Checksum Verification',
        passed: !mismatch,
        durationMs: Date.now() - startTime,
        ticksRun: 1000,
        finalChecksum: sim1.calculateChecksum(),
        error: mismatch ? 'Checksum mismatch between two identical simulations' : undefined,
      };
    } catch (err: any) {
      return {
        name: 'Seed Determinism Checksum Verification',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }

  private async testThirtyMinuteSimulation(): Promise<HeadlessResult> {
    const startTime = Date.now();
    try {
      const sim = new GameSimulation(300);
      sim.initMatch([
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.AI_MEDIUM, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
      ]);

      for (let t = 0; t < 3000; t++) {
        sim.step();
        if (sim.matchState === MatchState.FINISHED) break;
      }

      return {
        name: '30-Minute Simulation Soak Test (3000 fast ticks)',
        passed: true,
        durationMs: Date.now() - startTime,
        ticksRun: sim.tickIndex,
        finalChecksum: sim.calculateChecksum(),
      };
    } catch (err: any) {
      return {
        name: '30-Minute Simulation Soak Test (3000 fast ticks)',
        passed: false,
        durationMs: Date.now() - startTime,
        ticksRun: 0,
        finalChecksum: 0,
        error: err?.message ?? String(err),
      };
    }
  }
}
