export function createInitialBlackboard(playerIndex, factionId, difficulty = 'HARD_FAIR', personality = 'ADAPTIVE', team = playerIndex) {
    return {
        playerIndex,
        team,
        factionId,
        difficulty,
        personality,
        currentPhase: 'OPENING',
        credits: 10000,
        incomePerMin: 0,
        powerProduced: 100,
        powerConsumed: 0,
        isPowerLow: false,
        harvesterCount: 1,
        targetHarvesterCount: 2,
        intelEntries: new Map(),
        threatGrid: Array.from({ length: 32 }, () => new Array(32).fill(0)),
        hqPosition: null,
        baseRadius: 15,
        claimedOreNodes: [],
        activeGoals: [],
        assignedUnits: new Map()
    };
}
//# sourceMappingURL=aiBlackboard.js.map