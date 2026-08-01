import { FactionId } from '@ra4/shared-types';
export interface FactionPlan {
    powerBuildingId: string;
    refineryBuildingId: string;
    barracksBuildingId: string;
    factoryBuildingId: string;
    techBuildingId: string;
    defenseBuildingId: string;
    infantryUnitId: string;
    antiTankUnitId: string;
    scoutUnitId: string;
    tankUnitId: string;
    harvesterUnitId: string;
}
export declare const getFactionPlan: (factionId: FactionId) => FactionPlan;
//# sourceMappingURL=factionPlan.d.ts.map