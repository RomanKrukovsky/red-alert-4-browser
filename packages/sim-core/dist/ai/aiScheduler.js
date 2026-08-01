export var AIDecisionLane;
(function (AIDecisionLane) {
    AIDecisionLane["STRATEGY"] = "STRATEGY";
    AIDecisionLane["ECONOMY"] = "ECONOMY";
    AIDecisionLane["PRODUCTION"] = "PRODUCTION";
    AIDecisionLane["TACTICAL"] = "TACTICAL";
})(AIDecisionLane || (AIDecisionLane = {}));
export class AIScheduler {
    difficulty;
    constructor(difficulty = 'HARD_FAIR') {
        this.difficulty = difficulty;
    }
    scaleInterval(normalInterval, hardInterval = normalInterval) {
        if (this.difficulty === 'EASY')
            return normalInterval * 2;
        if (this.difficulty === 'HARD' || this.difficulty === 'HARD_FAIR')
            return hardInterval;
        return normalInterval;
    }
    shouldRunWorldModel(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3) % this.scaleInterval(15, 10) === 0;
    }
    shouldRunEconomy(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3) % this.scaleInterval(30) === 0;
    }
    shouldRunBasePlanner(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3 + 5) % this.scaleInterval(45) === 0;
    }
    shouldRunProduction(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 3 + 10) % this.scaleInterval(30) === 0;
    }
    shouldRunTactical(tickIndex, playerIndex) {
        return (tickIndex + playerIndex * 2) % this.scaleInterval(5, 3) === 0;
    }
}
//# sourceMappingURL=aiScheduler.js.map