import { GameSimulation, SkirmishAIAgent } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerType } from '@ra4/shared-types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function createDuel(seed = 1337): GameSimulation {
  const sim = new GameSimulation(seed);
  sim.initMatch([
    { name: 'Alliance', factionId: FactionId.ALLIANCE, type: PlayerType.HUMAN, team: 0 },
    { name: 'USSR', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 1 }
  ]);
  return sim;
}

console.log('Running AI correctness regression tests...');

{
  const aggressive = new SkirmishAIAgent(0, FactionId.ALLIANCE, 'NORMAL', 'AGGRESSIVE');
  const economic = new SkirmishAIAgent(0, FactionId.ALLIANCE, 'NORMAL', 'ECONOMIC');
  assert(
    aggressive.blackboard.targetHarvesterCount < economic.blackboard.targetHarvesterCount,
    'AI personalities must change economic targets'
  );

  const sim = new GameSimulation(7);
  sim.initMatch([
    { name: 'Easy', factionId: FactionId.USSR, type: PlayerType.AI_EASY, team: 0 },
    { name: 'Hard', factionId: FactionId.ALLIANCE, type: PlayerType.AI_HARD, team: 1 }
  ]);
  assert(sim.aiAgents.get(0)?.blackboard.difficulty === 'EASY', 'AI_EASY must select Easy decision settings');
  assert(sim.aiAgents.get(1)?.blackboard.difficulty === 'HARD_FAIR', 'AI_HARD must default to Hard Fair');
}

{
  const sim = createDuel();
  sim.step();
  assert(sim.fogOfWar.isVisible(0, 8, 8), 'owned HQ must reveal Fog of War around itself');
  assert(!sim.fogOfWar.isVisible(0, 56, 56), 'enemy HQ must remain hidden at match start');
}

{
  const sim = createDuel();
  for (let index = 0; index < 6; index++) {
    sim.spawnUnit('AL_BulwarkMBT', 0, 10_000 + index * 1_000, 10_000);
  }

  const agent = new SkirmishAIAgent(0, FactionId.ALLIANCE, 'HARD_FAIR', 'ADAPTIVE');
  const commands = agent.update(sim);
  assert(
    !commands.some(command => command.type === CommandType.ATTACK_MOVE),
    'AI must not attack an unexplored fallback coordinate without intelligence'
  );
}

{
  const sim = createDuel();
  const tankId = sim.spawnUnit('AL_BulwarkMBT', 0, 10_000, 10_000);
  sim.processCommands([{
    type: CommandType.ATTACK_MOVE,
    entityIds: [tankId],
    targetX: 20_000,
    targetY: 20_000,
    playerIndex: 0,
    tick: sim.tickIndex
  }]);
  assert(sim.entities.get(tankId)?.targetX !== undefined, 'ATTACK_MOVE must create a movement order');
}

{
  const sim = new GameSimulation(424242);
  sim.initMatch([
    { name: 'Human', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'Alliance AI', factionId: FactionId.ALLIANCE, type: PlayerType.AI_HARD, team: 1 }
  ]);

  for (let tick = 0; tick < 5_000; tick++) sim.step();

  const foreignUnits = Array.from(sim.entities.values()).filter(entity =>
    entity.playerIndex === 1 && !entity.isBuilding && entity.factionId !== FactionId.ALLIANCE
  );
  assert(foreignUnits.length === 0, 'Alliance AI must never produce units from another faction');
  assert(
    Array.from(sim.entities.values()).some(entity => entity.playerIndex === 1 && entity.specId === 'AL_BulwarkMBT'),
    'Alliance AI must unlock and produce its main battle tank after building the Intel Center'
  );
}

console.log('SUCCESS! AI correctness regression tests passed.');
