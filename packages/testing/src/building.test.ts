import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerType } from '@ra4/shared-types';

console.log('Running Stage 6 Base Building, Power & Unit Production Tests...');

const sim = new GameSimulation(1337);
sim.initMatch([
  { name: 'Player 1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 }
]);

const p0 = sim.players[0];
const initialCredits = p0.credits;

// Test 1: Build Structure
sim.processCommands([{
  type: CommandType.BUILD_STRUCTURE,
  structureId: 'SU_ThermalPower',
  gridX: 20,
  gridY: 20,
  entityIds: [],
  playerIndex: 0,
  tick: 0
}]);

if (p0.credits >= initialCredits) {
  console.error('Test 1 Failed: Building structure did not deduct credits');
  process.exit(1);
}

// Test 2: Power Grid Calculation
sim.step();
if (p0.powerProduced < 100) {
  console.error(`Test 2 Failed: Thermal Power plant did not increase power output! Power produced: ${p0.powerProduced}`);
  process.exit(1);
}

// Test 3: Unit Production Queue
const factoryId = sim.spawnBuilding('SU_HeavyFactory', 0, 25000, 25000);
const preProduceCredits = p0.credits;

sim.processCommands([{
  type: CommandType.PRODUCE_UNIT,
  producerEntityId: factoryId,
  unitId: 'SU_GranitMBT',
  entityIds: [],
  playerIndex: 0,
  tick: 1
}]);

if (p0.credits >= preProduceCredits) {
  console.error('Test 3 Failed: Producing unit did not deduct credits from player balance');
  process.exit(1);
}

const factory = sim.entities.get(factoryId)!;
if (factory.productionQueue.length === 0) {
  console.error('Test 3 Failed: Unit item was not added to factory production queue');
  process.exit(1);
}

// Step ticks until unit completes buildTime
const totalTicks = factory.productionQueue[0].totalTicks;
const countBefore = sim.entities.size;

for (let t = 0; t <= totalTicks + 5; t++) {
  sim.step();
}

if (sim.entities.size <= countBefore) {
  console.error('Test 3 Failed: Unit was not spawned after production queue completed');
  process.exit(1);
}

console.log('SUCCESS! All Stage 6 Base Building, Power & Unit Production Tests passed cleanly.');
