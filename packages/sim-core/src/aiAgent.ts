import { GameSimulation } from './simulation.js';
import { PlayerCommand, FactionId } from '@ra4/shared-types';
import { AIBlackboard, createInitialBlackboard } from './ai/aiBlackboard.js';
import { AIScheduler } from './ai/aiScheduler.js';
import { AIWorldModel } from './ai/worldModel.js';
import { AIDirector } from './ai/aiDirector.js';
import { AIEconomyManager } from './ai/economyManager.js';
import { AIBasePlanner } from './ai/basePlanner.js';
import { AIProductionManager } from './ai/productionManager.js';
import { AIArmyGroupManager } from './ai/armyGroupManager.js';
import { AITacticalController } from './ai/tacticalController.js';

export class SkirmishAIAgent {
  public playerIndex: number;
  public blackboard: AIBlackboard;

  private scheduler: AIScheduler;
  private worldModel: AIWorldModel;
  private director: AIDirector;
  private economyManager: AIEconomyManager;
  private basePlanner: AIBasePlanner;
  private productionManager: AIProductionManager;
  private armyGroupManager: AIArmyGroupManager;
  private tacticalController: AITacticalController;

  constructor(
    playerIndex: number,
    factionId: FactionId = FactionId.ALLIANCE,
    difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR' = 'HARD_FAIR',
    personality: 'AGGRESSIVE' | 'DEFENSIVE' | 'ECONOMIC' | 'ADAPTIVE' | 'RAIDER' = 'ADAPTIVE'
  ) {
    this.playerIndex = playerIndex;
    this.blackboard = createInitialBlackboard(playerIndex, factionId, difficulty, personality);

    this.scheduler = new AIScheduler();
    this.worldModel = new AIWorldModel();
    this.director = new AIDirector();
    this.economyManager = new AIEconomyManager();
    this.basePlanner = new AIBasePlanner();
    this.productionManager = new AIProductionManager();
    this.armyGroupManager = new AIArmyGroupManager();
    this.tacticalController = new AITacticalController();
  }

  public update(sim: GameSimulation): PlayerCommand[] {
    const commands: PlayerCommand[] = [];

    const p = sim.players[this.playerIndex];
    if (!p || !p.hasHQ) return commands;

    // 1. World Model (FOW intel update)
    if (this.scheduler.shouldRunWorldModel(sim.tickIndex, this.playerIndex)) {
      this.worldModel.update(sim, this.blackboard);
    }

    // 2. High-Level AI Director (phase & metrics)
    this.director.update(sim, this.blackboard);

    // 3. Economy Manager
    if (this.scheduler.shouldRunEconomy(sim.tickIndex, this.playerIndex)) {
      const ecoCmds = this.economyManager.update(sim, this.blackboard);
      commands.push(...ecoCmds);
    }

    // 4. Base Planner
    if (this.scheduler.shouldRunBasePlanner(sim.tickIndex, this.playerIndex)) {
      const baseCmds = this.basePlanner.update(sim, this.blackboard);
      commands.push(...baseCmds);
    }

    // 5. Production Manager
    if (this.scheduler.shouldRunProduction(sim.tickIndex, this.playerIndex)) {
      const prodCmds = this.productionManager.update(sim, this.blackboard);
      commands.push(...prodCmds);
    }

    // 6. Tactical Squad Control
    if (this.scheduler.shouldRunTactical(sim.tickIndex, this.playerIndex)) {
      const squads = this.armyGroupManager.update(sim, this.blackboard);
      const tacCmds = this.tacticalController.update(sim, this.blackboard, squads);
      commands.push(...tacCmds);
    }

    return commands;
  }
}
