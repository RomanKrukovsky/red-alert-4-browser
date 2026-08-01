export function getPersonalityProfile(bb) {
    switch (bb.personality) {
        case 'AGGRESSIVE':
            return { name: 'AGGRESSIVE', targetHarvesters: 1, strikeThreshold: 3, defenseReserve: 1, aggressionWeight: 1.5 };
        case 'DEFENSIVE':
            return { name: 'DEFENSIVE', targetHarvesters: 2, strikeThreshold: 6, defenseReserve: 4, aggressionWeight: 0.7 };
        case 'ECONOMIC':
            return { name: 'ECONOMIC', targetHarvesters: 3, strikeThreshold: 5, defenseReserve: 2, aggressionWeight: 0.9 };
        case 'RAIDER':
            return { name: 'RAIDER', targetHarvesters: 2, strikeThreshold: 4, defenseReserve: 1, aggressionWeight: 1.2 };
        case 'ADAPTIVE':
        default:
            return { name: 'ADAPTIVE', targetHarvesters: 2, strikeThreshold: 4, defenseReserve: 2, aggressionWeight: 1.0 };
    }
}
//# sourceMappingURL=aiPersonalities.js.map