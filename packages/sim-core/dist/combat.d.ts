import { ArmorType, DamageType } from '@ra4/shared-types';
export declare const DAMAGE_MULTIPLIERS: Record<DamageType, Record<ArmorType, number>>;
export declare function calculateDamage(baseDamage: number, damageType: DamageType, armorType: ArmorType): number;
//# sourceMappingURL=combat.d.ts.map