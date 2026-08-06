import { PlayerCommand, CommandType } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const UNIT_BY_ID = new Map(DEFAULT_DATABASE.units.map((u) => [u.id, u]));
const BUILDING_BY_ID = new Map(DEFAULT_DATABASE.buildings.map((b) => [b.id, b]));

const ok: ValidationResult = { valid: true };
function fail(reason: string): ValidationResult {
  return { valid: false, reason };
}

/**
 * Server-side command validation — the client is untrusted.
 *
 * Checks, per command type:
 *  - playerIndex integrity (no spoofing);
 *  - entity existence and ownership;
 *  - map bounds;
 *  - real cost vs current credits (content data, not magic constants);
 *  - faction match and tech-tree prerequisites;
 *  - command cap;
 *  - command size limits (anti-flood).
 */
export function validatePlayerCommand(cmd: PlayerCommand, sim: GameSimulation, playerIndex: number): ValidationResult {
  if (cmd.playerIndex !== playerIndex) return fail('Command playerIndex spoofing attempt');

  const p = sim.players[playerIndex];
  if (!p) return fail('Player index out of bounds');
  if (sim.surrenderedPlayers.has(playerIndex)) return fail('Player has surrendered');

  if (cmd.entityIds && cmd.entityIds.length > 200) {
    return fail(`Command entity count ${cmd.entityIds.length} exceeds limit of 200`);
  }

  const ownedSpecIds = (): Set<string> => {
    const set = new Set<string>();
    for (const entity of sim.entities.values()) {
      if (entity.playerIndex === playerIndex) set.add(entity.specId);
    }
    return set;
  };

  const validateOwnedMobileEntities = (): ValidationResult => {
    for (const id of cmd.entityIds) {
      const entity = sim.entities.get(id);
      if (!entity) return fail(`Entity ${id} does not exist`);
      if (entity.playerIndex !== playerIndex) return fail(`Entity ${id} belongs to player ${entity.playerIndex}`);
    }
    return ok;
  };

  const validateTargetInBounds = (x: number, y: number): ValidationResult => {
    if (x < 0 || y < 0 || x > sim.mapWidth * 1000 || y > sim.mapHeight * 1000) {
      return fail(`Target (${x}, ${y}) outside map bounds`);
    }
    return ok;
  };

  switch (cmd.type) {
    case CommandType.MOVE:
    case CommandType.ATTACK_MOVE:
    case CommandType.PATROL: {
      const owned = validateOwnedMobileEntities();
      if (!owned.valid) return owned;
      return validateTargetInBounds(cmd.targetX, cmd.targetY);
    }

    case CommandType.SET_STANCE:
      return validateOwnedMobileEntities();

    case CommandType.ATTACK: {
      const owned = validateOwnedMobileEntities();
      if (!owned.valid) return owned;
      const target = sim.entities.get(cmd.targetEntityId);
      if (!target) return fail(`Attack target ${cmd.targetEntityId} does not exist`);
      if (target.playerIndex === playerIndex) return fail('Cannot attack own entity');
      return ok;
    }

    case CommandType.STOP:
    case CommandType.HOLD:
    case CommandType.GUARD:
    case CommandType.GATHER:
      return validateOwnedMobileEntities();

    case CommandType.BUILD_STRUCTURE: {
      const spec = BUILDING_BY_ID.get(cmd.structureId);
      if (!spec) return fail(`Unknown structure ${cmd.structureId}`);
      if (spec.factionId !== sim.playerFactions[playerIndex]) {
        return fail(`Structure ${cmd.structureId} not available to faction ${sim.playerFactions[playerIndex]}`);
      }
      if (cmd.gridX < 0 || cmd.gridY < 0 || cmd.gridX >= sim.mapWidth || cmd.gridY >= sim.mapHeight) {
        return fail('Grid coordinates out of map bounds');
      }
      if (p.credits < spec.cost) {
        return fail(`Insufficient credits: need ${spec.cost}, have ${p.credits}`);
      }
      const owned = ownedSpecIds();
      for (const prereq of spec.prerequisites) {
        if (!owned.has(prereq)) return fail(`Missing prerequisite ${prereq} for ${cmd.structureId}`);
      }
      return ok;
    }

    case CommandType.PRODUCE_UNIT: {
      const producer = sim.entities.get(cmd.producerEntityId);
      if (!producer) return fail('Producer entity does not exist');
      if (producer.playerIndex !== playerIndex) return fail('Producer ownership mismatch');
      if (!producer.isBuilding) return fail('Producer is not a building');
      const spec = UNIT_BY_ID.get(cmd.unitId);
      if (!spec) return fail(`Unknown unit ${cmd.unitId}`);
      if (spec.factionId !== sim.playerFactions[playerIndex]) {
        return fail(`Unit ${cmd.unitId} not available to faction ${sim.playerFactions[playerIndex]}`);
      }
      if (p.credits < spec.cost) {
        return fail(`Insufficient credits: need ${spec.cost}, have ${p.credits}`);
      }
      if (p.commandCapUsed + spec.commandCapCost > p.commandCapMax) {
        return fail(`Command cap exceeded: ${p.commandCapUsed}+${spec.commandCapCost} > ${p.commandCapMax}`);
      }
      const owned = ownedSpecIds();
      for (const prereq of spec.prerequisites) {
        if (!owned.has(prereq)) return fail(`Missing prerequisite ${prereq} for ${cmd.unitId}`);
      }
      if (producer.productionQueue.length >= 10) return fail('Production queue is full');
      return ok;
    }

    case CommandType.CANCEL_PRODUCTION: {
      const producer = sim.entities.get(cmd.producerEntityId);
      if (!producer) return fail('Producer entity does not exist');
      if (producer.playerIndex !== playerIndex) return fail('Producer ownership mismatch');
      if (cmd.queueIndex < 0 || cmd.queueIndex >= producer.productionQueue.length) {
        return fail('Queue index out of range');
      }
      return ok;
    }

    case CommandType.SELL_STRUCTURE:
    case CommandType.REPAIR_STRUCTURE: {
      const structure = sim.entities.get(cmd.structureEntityId);
      if (!structure) return fail('Structure does not exist');
      if (structure.playerIndex !== playerIndex) return fail('Structure ownership mismatch');
      if (!structure.isBuilding) return fail('Entity is not a structure');
      return ok;
    }

    case CommandType.USE_ABILITY: {
      if (cmd.targetX !== undefined && cmd.targetY !== undefined) {
        return validateTargetInBounds(cmd.targetX, cmd.targetY);
      }
      return ok;
    }

    case CommandType.CAPTURE_BUILDING: {
      const owned = validateOwnedMobileEntities();
      if (!owned.valid) return owned;
      const target = sim.entities.get(cmd.targetStructureId);
      if (!target) return fail('Capture target does not exist');
      if (!target.isBuilding) return fail('Capture target is not a building');
      if (target.playerIndex === playerIndex) return fail('Cannot capture own building');
      return ok;
    }

    case CommandType.DEPOSIT_ORE:
      return validateOwnedMobileEntities();

    case CommandType.SURRENDER:
      return ok;

    default:
      return fail('Unhandled command type');
  }
}
