import { NavigationService, GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, PlayerType } from '@ra4/shared-types';

console.log('Running Stage 3 Navigation & Movement Tests...');

// Test 1: Navigation A* Pathfinding
const nav = new NavigationService(64, 64);
const path = nav.findPath(5000, 5000, 20000, 20000);

if (path.length === 0) {
  console.error('Test 1 Failed: Path length is 0');
  process.exit(1);
}

// Test 2: Group Formation Offsets
const formations = nav.calculateGroupFormations(30000, 30000, 4, 2000);
if (formations.length !== 4) {
  console.error('Test 2 Failed: Expected 4 formation offsets');
  process.exit(1);
}

// Check that formation offsets do not overlap
const posSet = new Set(formations.map((f: { x: number; y: number }) => `${f.x}:${f.y}`));
if (posSet.size !== 4) {
  console.error('Test 2 Failed: Group formation targets overlap!');
  process.exit(1);
}

// Test 3: Simulation Move & Waypoints
const sim = new GameSimulation(1337);
sim.initMatch([
  { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 }
]);

const unitId = sim.spawnUnit('SU_GranitMBT', 0, 10000, 10000);

sim.processCommands([{
  type: CommandType.MOVE,
  entityIds: [unitId],
  targetX: 20000,
  targetY: 10000,
  playerIndex: 0,
  tick: 0
}]);

const entityBefore = sim.entities.get(unitId)!;
if (!entityBefore.targetX || !entityBefore.waypoints) {
  console.error('Test 3 Failed: Waypoints not assigned on MOVE command');
  process.exit(1);
}

// Step 30 ticks (1 second of movement)
for (let i = 0; i < 30; i++) {
  sim.step();
}

const entityAfter = sim.entities.get(unitId)!;
if (entityAfter.x === 10000) {
  console.error('Test 3 Failed: Unit did not move after 30 ticks');
  process.exit(1);
}

// Test 4: STOP command
sim.processCommands([{
  type: CommandType.STOP,
  entityIds: [unitId],
  playerIndex: 0,
  tick: 30
}]);

if (entityAfter.waypoints !== undefined || entityAfter.targetX !== undefined) {
  console.error('Test 4 Failed: STOP command did not clear waypoints');
  process.exit(1);
}

console.log('SUCCESS! All Stage 3 Navigation & Movement Tests passed cleanly.');
