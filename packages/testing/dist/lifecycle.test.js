import { MatchLifecycleManager, MatchLifecycleState } from '@ra4/sim-core';
import { FactionId, PlayerType, CommandType } from '@ra4/shared-types';
console.log('Running Stage 1 Architectural Foundation Tests...');
const manager = new MatchLifecycleManager();
// Test 1: Initialize
manager.initialize({
    seed: 9999,
    tickRate: 30,
    players: [
        { name: 'P1', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'P2', factionId: FactionId.ALLIANCE, type: PlayerType.AI_EASY, team: 1 }
    ]
});
if (manager.state !== MatchLifecycleState.INITIALIZED) {
    console.error('Test 1 Failed: Expected state INITIALIZED');
    process.exit(1);
}
// Test 2: Command Bus Dispatch
const dispatchRes = manager.commandBus.dispatch({
    type: CommandType.MOVE,
    entityIds: [1],
    targetX: 10000,
    targetY: 10000,
    playerIndex: 0,
    tick: 0
});
if (!dispatchRes.accepted) {
    console.error('Test 2 Failed: Command dispatch failed');
    process.exit(1);
}
// Test 3: Event Emitter
let eventReceived = false;
manager.events.on('MatchLost', (data) => {
    eventReceived = true;
});
manager.events.emit('MatchLost', { playerIndex: 1 });
if (!eventReceived) {
    console.error('Test 3 Failed: Event emitter did not trigger callback');
    process.exit(1);
}
// Test 4: Dispose
manager.dispose();
if (manager.state !== MatchLifecycleState.DISPOSED || manager.sim !== null) {
    console.error('Test 4 Failed: Disposal failed to reset state');
    process.exit(1);
}
console.log('SUCCESS! All Stage 1 Architectural Foundation Tests passed cleanly.');
//# sourceMappingURL=lifecycle.test.js.map