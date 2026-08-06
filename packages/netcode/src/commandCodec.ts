import { CommandType, PlayerCommand } from '@ra4/shared-types';
import { BinReader, BinWriter, WireError } from './wire.js';

/**
 * Compact binary codec for PlayerCommand.
 *
 * Layout per command:
 *   u8   command type tag
 *   u8   playerIndex
 *   u32  tick
 *   u16  entityIds count, then i32 × count
 *   ...  type-specific fields
 *
 * The codec is exhaustive over CommandType — adding a command type without
 * extending the codec fails loudly at encode time.
 */

const TYPE_TO_TAG: Record<CommandType, number> = {
  [CommandType.MOVE]: 1,
  [CommandType.ATTACK]: 2,
  [CommandType.ATTACK_MOVE]: 3,
  [CommandType.STOP]: 4,
  [CommandType.HOLD]: 5,
  [CommandType.PATROL]: 6,
  [CommandType.GUARD]: 7,
  [CommandType.BUILD_STRUCTURE]: 8,
  [CommandType.PRODUCE_UNIT]: 9,
  [CommandType.CANCEL_PRODUCTION]: 10,
  [CommandType.SELL_STRUCTURE]: 11,
  [CommandType.REPAIR_STRUCTURE]: 12,
  [CommandType.USE_ABILITY]: 13,
  [CommandType.CAPTURE_BUILDING]: 14,
  [CommandType.DEPOSIT_ORE]: 15,
  [CommandType.GATHER]: 16,
  [CommandType.SURRENDER]: 17,
};

const TAG_TO_TYPE: Record<number, CommandType> = Object.fromEntries(
  Object.entries(TYPE_TO_TAG).map(([k, v]) => [v, k as CommandType])
);

export const MAX_COMMANDS_PER_FRAME = 256;
export const MAX_ENTITIES_PER_COMMAND = 200;

export function encodeCommand(w: BinWriter, cmd: PlayerCommand): void {
  const tag = TYPE_TO_TAG[cmd.type];
  if (tag === undefined) throw new WireError('UNKNOWN_COMMAND', `no codec for command type ${cmd.type}`);
  w.u8(tag);
  w.u8(cmd.playerIndex);
  w.u32(cmd.tick);
  const ids = cmd.entityIds ?? [];
  if (ids.length > MAX_ENTITIES_PER_COMMAND) throw new WireError('TOO_MANY_ENTITIES', `${ids.length} > ${MAX_ENTITIES_PER_COMMAND}`);
  w.u16(ids.length);
  for (const id of ids) w.i32(id);

  switch (cmd.type) {
    case CommandType.MOVE:
    case CommandType.ATTACK_MOVE:
    case CommandType.PATROL:
      w.i32(cmd.targetX); w.i32(cmd.targetY);
      break;
    case CommandType.ATTACK:
      w.i32(cmd.targetEntityId);
      break;
    case CommandType.GUARD:
      w.i32((cmd as { targetEntityId?: number }).targetEntityId ?? -1);
      break;
    case CommandType.STOP:
    case CommandType.HOLD:
    case CommandType.SURRENDER:
      break;
    case CommandType.BUILD_STRUCTURE:
      w.str(cmd.structureId); w.i32(cmd.gridX); w.i32(cmd.gridY);
      break;
    case CommandType.PRODUCE_UNIT:
      w.i32(cmd.producerEntityId); w.str(cmd.unitId);
      break;
    case CommandType.CANCEL_PRODUCTION:
      w.i32(cmd.producerEntityId); w.i32(cmd.queueIndex);
      break;
    case CommandType.SELL_STRUCTURE:
      w.i32(cmd.structureEntityId);
      break;
    case CommandType.REPAIR_STRUCTURE:
      w.i32(cmd.structureEntityId);
      break;
    case CommandType.USE_ABILITY:
      w.str(cmd.abilityId);
      w.i32(cmd.targetX ?? -1); w.i32(cmd.targetY ?? -1); w.i32(cmd.targetEntityId ?? -1);
      break;
    case CommandType.CAPTURE_BUILDING:
      w.i32(cmd.targetStructureId);
      break;
    case CommandType.DEPOSIT_ORE:
      w.i32(cmd.refineryEntityId);
      break;
    case CommandType.GATHER:
      w.str(cmd.resourceNodeId ?? '');
      break;
  }
}

export function decodeCommand(r: BinReader): PlayerCommand {
  const tag = r.u8();
  const type = TAG_TO_TYPE[tag];
  if (!type) throw new WireError('UNKNOWN_COMMAND_TAG', `tag ${tag}`);
  const playerIndex = r.u8();
  const tick = r.u32();
  const idCount = r.u16();
  if (idCount > MAX_ENTITIES_PER_COMMAND) throw new WireError('TOO_MANY_ENTITIES', `${idCount}`);
  const entityIds: number[] = [];
  for (let i = 0; i < idCount; i++) entityIds.push(r.i32());
  const base = { playerIndex, tick, entityIds };

  switch (type) {
    case CommandType.MOVE:
    case CommandType.ATTACK_MOVE:
    case CommandType.PATROL:
      return { ...base, type, targetX: r.i32(), targetY: r.i32() } as PlayerCommand;
    case CommandType.ATTACK:
      return { ...base, type, targetEntityId: r.i32() } as PlayerCommand;
    case CommandType.GUARD: {
      const targetEntityId = r.i32();
      return { ...base, type, ...(targetEntityId >= 0 ? { targetEntityId } : {}) } as PlayerCommand;
    }
    case CommandType.STOP:
    case CommandType.HOLD:
    case CommandType.SURRENDER:
      return { ...base, type } as PlayerCommand;
    case CommandType.BUILD_STRUCTURE:
      return { ...base, type, structureId: r.str(), gridX: r.i32(), gridY: r.i32() } as PlayerCommand;
    case CommandType.PRODUCE_UNIT:
      return { ...base, type, producerEntityId: r.i32(), unitId: r.str() } as PlayerCommand;
    case CommandType.CANCEL_PRODUCTION:
      return { ...base, type, producerEntityId: r.i32(), queueIndex: r.i32() } as PlayerCommand;
    case CommandType.SELL_STRUCTURE:
      return { ...base, type, structureEntityId: r.i32() } as PlayerCommand;
    case CommandType.REPAIR_STRUCTURE:
      return { ...base, type, structureEntityId: r.i32() } as PlayerCommand;
    case CommandType.USE_ABILITY: {
      const abilityId = r.str();
      const tx = r.i32(); const ty = r.i32(); const te = r.i32();
      return {
        ...base, type, abilityId,
        ...(tx >= 0 ? { targetX: tx } : {}),
        ...(ty >= 0 ? { targetY: ty } : {}),
        ...(te >= 0 ? { targetEntityId: te } : {}),
      } as PlayerCommand;
    }
    case CommandType.CAPTURE_BUILDING:
      return { ...base, type, targetStructureId: r.i32() } as PlayerCommand;
    case CommandType.DEPOSIT_ORE:
      return { ...base, type, refineryEntityId: r.i32() } as PlayerCommand;
    case CommandType.GATHER: {
      const resourceNodeId = r.str();
      return { ...base, type, ...(resourceNodeId ? { resourceNodeId } : {}) } as PlayerCommand;
    }
  }
}

export function encodeCommandList(commands: PlayerCommand[]): Uint8Array {
  if (commands.length > MAX_COMMANDS_PER_FRAME) {
    throw new WireError('TOO_MANY_COMMANDS', `${commands.length} > ${MAX_COMMANDS_PER_FRAME}`);
  }
  const w = new BinWriter(64 + commands.length * 32);
  w.u16(commands.length);
  for (const cmd of commands) encodeCommand(w, cmd);
  return w.finish();
}

export function decodeCommandList(payload: Uint8Array): PlayerCommand[] {
  const r = new BinReader(payload);
  const count = r.u16();
  if (count > MAX_COMMANDS_PER_FRAME) throw new WireError('TOO_MANY_COMMANDS', `${count}`);
  const out: PlayerCommand[] = [];
  for (let i = 0; i < count; i++) out.push(decodeCommand(r));
  return out;
}

// ── Tick frame (server → client) ────────────────────────────────────────

export interface TickFramePayload {
  tick: number;
  commands: PlayerCommand[];
}

export function encodeTickFrame(frame: TickFramePayload): Uint8Array {
  const w = new BinWriter(64 + frame.commands.length * 32);
  w.u32(frame.tick);
  w.u16(frame.commands.length);
  for (const cmd of frame.commands) encodeCommand(w, cmd);
  return w.finish();
}

export function decodeTickFrame(payload: Uint8Array): TickFramePayload {
  const r = new BinReader(payload);
  const tick = r.u32();
  const count = r.u16();
  if (count > MAX_COMMANDS_PER_FRAME) throw new WireError('TOO_MANY_COMMANDS', `${count}`);
  const commands: PlayerCommand[] = [];
  for (let i = 0; i < count; i++) commands.push(decodeCommand(r));
  return { tick, commands };
}

// ── Checksum messages ────────────────────────────────────────────────────

export interface ChecksumPayload {
  tick: number;
  checksum: number;
}

export function encodeChecksum(p: ChecksumPayload): Uint8Array {
  const w = new BinWriter(8);
  w.u32(p.tick);
  w.u32(p.checksum);
  return w.finish();
}

export function decodeChecksum(payload: Uint8Array): ChecksumPayload {
  const r = new BinReader(payload);
  return { tick: r.u32(), checksum: r.u32() };
}
