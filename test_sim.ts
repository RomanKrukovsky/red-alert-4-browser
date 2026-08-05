import { MatchLifecycleManager } from './packages/sim-core/src/lifecycle.js';
import { FactionId, PlayerType } from './packages/shared-types/src/index.js';

const manager = new MatchLifecycleManager();
manager.initialize({
  players: [
    { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
    { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_EASY, team: 1 },
  ]
});

manager.start((snapshot) => {
  console.log("Tick:", snapshot.tick, "Credits:", snapshot.players[0].credits);
  if (snapshot.tick > 10) manager.stop();
});

setTimeout(() => manager.stop(), 1000);
