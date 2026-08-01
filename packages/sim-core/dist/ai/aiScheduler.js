export class AIScheduler {
    shouldRunWorldModel(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3) % 15 === 0;
    }
    shouldRunEconomy(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3) % 30 === 0;
    }
    shouldRunBasePlanner(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3 + 5) % 45 === 0;
    }
    shouldRunProduction(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3 + 10) % 30 === 0;
    }
    shouldRunTactical(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 2) % 5 === 0;
    }
}
//# sourceMappingURL=aiScheduler.js.map