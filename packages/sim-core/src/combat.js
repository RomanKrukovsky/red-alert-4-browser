import { ArmorType, DamageType } from '@ra4/shared-types';
// Armor multipliers from RA4 Bible v2.0 section 2.2
export const DAMAGE_MULTIPLIERS = {
    [DamageType.Ballistic]: {
        [ArmorType.LightInfantry]: 1.0,
        [ArmorType.HeavyInfantry]: 0.8,
        [ArmorType.LightVehicle]: 0.6,
        [ArmorType.HeavyVehicle]: 0.35,
        [ArmorType.SiegeVehicle]: 0.4,
        [ArmorType.Air]: 0.0,
        [ArmorType.Naval]: 0.4,
        [ArmorType.Structure]: 0.25,
        [ArmorType.Shield]: 0.7
    },
    [DamageType.Shrapnel]: {
        [ArmorType.LightInfantry]: 1.5,
        [ArmorType.HeavyInfantry]: 1.15,
        [ArmorType.LightVehicle]: 0.55,
        [ArmorType.HeavyVehicle]: 0.3,
        [ArmorType.SiegeVehicle]: 0.4,
        [ArmorType.Air]: 0.0,
        [ArmorType.Naval]: 0.3,
        [ArmorType.Structure]: 0.4,
        [ArmorType.Shield]: 0.5
    },
    [DamageType.ArmorPiercing]: {
        [ArmorType.LightInfantry]: 0.6,
        [ArmorType.HeavyInfantry]: 0.9,
        [ArmorType.LightVehicle]: 1.2,
        [ArmorType.HeavyVehicle]: 1.45,
        [ArmorType.SiegeVehicle]: 1.3,
        [ArmorType.Air]: 0.0,
        [ArmorType.Naval]: 1.1,
        [ArmorType.Structure]: 0.8,
        [ArmorType.Shield]: 0.8
    },
    [DamageType.Siege]: {
        [ArmorType.LightInfantry]: 0.8,
        [ArmorType.HeavyInfantry]: 0.8,
        [ArmorType.LightVehicle]: 1.0,
        [ArmorType.HeavyVehicle]: 1.15,
        [ArmorType.SiegeVehicle]: 1.2,
        [ArmorType.Air]: 0.0,
        [ArmorType.Naval]: 1.0,
        [ArmorType.Structure]: 1.7,
        [ArmorType.Shield]: 0.9
    },
    [DamageType.Electric]: {
        [ArmorType.LightInfantry]: 1.0,
        [ArmorType.HeavyInfantry]: 1.15,
        [ArmorType.LightVehicle]: 1.3,
        [ArmorType.HeavyVehicle]: 1.35,
        [ArmorType.SiegeVehicle]: 1.2,
        [ArmorType.Air]: 0.75,
        [ArmorType.Naval]: 1.0,
        [ArmorType.Structure]: 1.0,
        [ArmorType.Shield]: 1.5
    },
    [DamageType.Plasma]: {
        [ArmorType.LightInfantry]: 1.1,
        [ArmorType.HeavyInfantry]: 1.25,
        [ArmorType.LightVehicle]: 1.1,
        [ArmorType.HeavyVehicle]: 1.1,
        [ArmorType.SiegeVehicle]: 1.1,
        [ArmorType.Air]: 0.9,
        [ArmorType.Naval]: 1.0,
        [ArmorType.Structure]: 0.9,
        [ArmorType.Shield]: 1.2
    },
    [DamageType.Cryo]: {
        [ArmorType.LightInfantry]: 0.9,
        [ArmorType.HeavyInfantry]: 1.0,
        [ArmorType.LightVehicle]: 0.8,
        [ArmorType.HeavyVehicle]: 0.8,
        [ArmorType.SiegeVehicle]: 0.8,
        [ArmorType.Air]: 0.8,
        [ArmorType.Naval]: 0.8,
        [ArmorType.Structure]: 0.6,
        [ArmorType.Shield]: 0.8
    },
    [DamageType.Temporal]: {
        [ArmorType.LightInfantry]: 1.0,
        [ArmorType.HeavyInfantry]: 1.0,
        [ArmorType.LightVehicle]: 1.0,
        [ArmorType.HeavyVehicle]: 1.0,
        [ArmorType.SiegeVehicle]: 1.0,
        [ArmorType.Air]: 1.0,
        [ArmorType.Naval]: 1.0,
        [ArmorType.Structure]: 0.8,
        [ArmorType.Shield]: 1.0
    },
    [DamageType.AntiAir]: {
        [ArmorType.LightInfantry]: 0.0,
        [ArmorType.HeavyInfantry]: 0.0,
        [ArmorType.LightVehicle]: 0.0,
        [ArmorType.HeavyVehicle]: 0.0,
        [ArmorType.SiegeVehicle]: 0.0,
        [ArmorType.Air]: 1.5,
        [ArmorType.Naval]: 0.0,
        [ArmorType.Structure]: 0.0,
        [ArmorType.Shield]: 1.0
    }
};
export function calculateDamage(baseDamage, damageType, armorType) {
    const mult = DAMAGE_MULTIPLIERS[damageType]?.[armorType] ?? 1.0;
    return Math.max(1, Math.round(baseDamage * mult));
}
//# sourceMappingURL=combat.js.map