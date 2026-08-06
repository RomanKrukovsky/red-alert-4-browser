import { CommandType, UnitStance } from './enums.js';
export interface BaseCommand {
    type: CommandType;
    entityIds: number[];
    playerIndex: number;
    tick: number;
}
export interface MoveCommand extends BaseCommand {
    type: CommandType.MOVE;
    targetX: number;
    targetY: number;
}
export interface AttackCommand extends BaseCommand {
    type: CommandType.ATTACK;
    targetEntityId: number;
}
export interface AttackMoveCommand extends BaseCommand {
    type: CommandType.ATTACK_MOVE;
    targetX: number;
    targetY: number;
}
export interface StopCommand extends BaseCommand {
    type: CommandType.STOP;
}
export interface HoldCommand extends BaseCommand {
    type: CommandType.HOLD;
}
export interface PatrolCommand extends BaseCommand {
    type: CommandType.PATROL;
    /** Next patrol waypoint. Issued repeatedly (Shift-click) to build a route. */
    targetX: number;
    targetY: number;
    /** When true, append to the existing route instead of replacing it. */
    append?: boolean;
}
export interface GuardCommand extends BaseCommand {
    type: CommandType.GUARD;
    /** Guard a specific entity (follows it), or a fixed point when omitted. */
    targetEntityId?: number;
    targetX?: number;
    targetY?: number;
}
export interface SetStanceCommand extends BaseCommand {
    type: CommandType.SET_STANCE;
    stance: UnitStance;
}
export interface BuildStructureCommand extends BaseCommand {
    type: CommandType.BUILD_STRUCTURE;
    structureId: string;
    gridX: number;
    gridY: number;
}
export interface ProduceUnitCommand extends BaseCommand {
    type: CommandType.PRODUCE_UNIT;
    producerEntityId: number;
    unitId: string;
}
export interface CancelProductionCommand extends BaseCommand {
    type: CommandType.CANCEL_PRODUCTION;
    producerEntityId: number;
    queueIndex: number;
}
export interface SellStructureCommand extends BaseCommand {
    type: CommandType.SELL_STRUCTURE;
    structureEntityId: number;
}
export interface RepairStructureCommand extends BaseCommand {
    type: CommandType.REPAIR_STRUCTURE;
    structureEntityId: number;
}
export interface UseAbilityCommand extends BaseCommand {
    type: CommandType.USE_ABILITY;
    abilityId: string;
    targetX?: number;
    targetY?: number;
    targetEntityId?: number;
}
export interface CaptureBuildingCommand extends BaseCommand {
    type: CommandType.CAPTURE_BUILDING;
    targetStructureId: number;
}
export interface GatherCommand extends BaseCommand {
    type: CommandType.GATHER;
    resourceNodeId?: string;
}
export interface DepositOreCommand extends BaseCommand {
    type: CommandType.DEPOSIT_ORE;
    refineryEntityId: number;
}
export interface SurrenderCommand extends BaseCommand {
    type: CommandType.SURRENDER;
}
export type PlayerCommand = MoveCommand | AttackCommand | AttackMoveCommand | StopCommand | HoldCommand | PatrolCommand | GuardCommand | SetStanceCommand | BuildStructureCommand | ProduceUnitCommand | CancelProductionCommand | SellStructureCommand | RepairStructureCommand | UseAbilityCommand | CaptureBuildingCommand | DepositOreCommand | GatherCommand | SurrenderCommand;
//# sourceMappingURL=commands.d.ts.map