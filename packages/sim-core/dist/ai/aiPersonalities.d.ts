import { AIBlackboard } from './aiBlackboard.js';
export interface AIPersonalityProfile {
    name: string;
    targetHarvesters: number;
    strikeThreshold: number;
    defenseReserve: number;
    aggressionWeight: number;
}
export declare function getPersonalityProfile(bb: AIBlackboard): AIPersonalityProfile;
//# sourceMappingURL=aiPersonalities.d.ts.map