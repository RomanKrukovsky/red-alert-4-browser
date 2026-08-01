import { FactionId } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';

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

const fallbackPlan: FactionPlan = {
  powerBuildingId: 'SU_ThermalPower',
  refineryBuildingId: 'SU_OreRefinery',
  barracksBuildingId: 'SU_MobilizationBarracks',
  factoryBuildingId: 'SU_HeavyFactory',
  techBuildingId: 'SU_CommandRadar',
  defenseBuildingId: 'SU_Pillbox',
  infantryUnitId: 'SU_RubezhRifleman',
  antiTankUnitId: 'SU_ZaslonAATeam',
  scoutUnitId: 'SU_RysScout',
  tankUnitId: 'SU_GranitMBT',
  harvesterUnitId: 'SU_BogatyrOreCarrier',
};

export const getFactionPlan = (factionId: FactionId): FactionPlan => {
  const faction = DEFAULT_DATABASE.factions.find((candidate) => candidate.id === factionId);
  if (!faction) return fallbackPlan;

  const factionUnits = DEFAULT_DATABASE.units.filter((unit) => unit.factionId === factionId);
  const infantryUnit = factionUnits.find((unit) => unit.category === 'Infantry' && unit.harvesterCapacity === undefined);
  const antiTankUnit = factionUnits.find((unit) => unit.category === 'Infantry' && unit.weaponId && unit !== infantryUnit);
  const scoutUnit = factionUnits.find((unit) => unit.id.includes('Scout'));
  const tankUnit = factionUnits.find((unit) => unit.category === 'Vehicle' && unit.weaponId && !unit.harvesterCapacity && !unit.id.includes('Scout'));
  const harvesterUnit = factionUnits.find((unit) => unit.harvesterCapacity !== undefined);

  return {
    powerBuildingId: faction.powerBuildingId,
    refineryBuildingId: faction.refineryBuildingId,
    barracksBuildingId: faction.barracksBuildingId,
    factoryBuildingId: faction.factoryBuildingId,
    techBuildingId: faction.techBuildingId,
    defenseBuildingId: faction.defenseBuildingId,
    infantryUnitId: infantryUnit?.id ?? fallbackPlan.infantryUnitId,
    antiTankUnitId: antiTankUnit?.id ?? fallbackPlan.antiTankUnitId,
    scoutUnitId: scoutUnit?.id ?? fallbackPlan.scoutUnitId,
    tankUnitId: tankUnit?.id ?? fallbackPlan.tankUnitId,
    harvesterUnitId: harvesterUnit?.id ?? fallbackPlan.harvesterUnitId,
  };
};
