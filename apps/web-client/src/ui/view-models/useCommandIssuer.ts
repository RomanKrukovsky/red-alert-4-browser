import { useCallback, useMemo } from 'react';
import { CommandType, PlayerCommand } from '@ra4/shared-types';
import { useUIStore } from '@ra4/ui';

/**
 * Typed command issuer interface for gameplay HUD interactions.
 * All methods create properly typed PlayerCommand objects and dispatch them.
 */
export interface CommandIssuer {
  issueMove: (entityIds: number[], targetX: number, targetY: number) => void;
  issueAttack: (entityIds: number[], targetEntityId: number) => void;
  issueAttackMove: (entityIds: number[], targetX: number, targetY: number) => void;
  issueStop: (entityIds: number[]) => void;
  issueHold: (entityIds: number[]) => void;
  issueProduceUnit: (producerEntityId: number, unitId: string) => void;
  issueBuildStructure: (structureId: string, gridX: number, gridY: number) => void;
  issueCancelProduction: (producerEntityId: number, queueIndex: number) => void;
  issueSellStructure: (structureEntityId: number) => void;
  issueRepairStructure: (structureEntityId: number) => void;
  issueGather: (entityIds: number[]) => void;
}

/**
 * Hook that wraps raw command dispatch into typed, ergonomic methods.
 * Reads current tick from the Zustand store and auto-fills playerIndex/tick.
 */
export function useCommandIssuer(
  onIssueCommand: (command: PlayerCommand) => void
): CommandIssuer {
  const playerIndex = useUIStore((state) => state.activePlayerIndex);

  const getNextTick = useCallback((): number => {
    const snapshot = useUIStore.getState().snapshot;
    return (snapshot?.tick ?? 0) + 1;
  }, []);

  return useMemo((): CommandIssuer => ({
    issueMove(entityIds, targetX, targetY) {
      onIssueCommand({
        type: CommandType.MOVE,
        entityIds,
        playerIndex,
        tick: getNextTick(),
        targetX,
        targetY,
      });
    },

    issueAttack(entityIds, targetEntityId) {
      onIssueCommand({
        type: CommandType.ATTACK,
        entityIds,
        playerIndex,
        tick: getNextTick(),
        targetEntityId,
      });
    },

    issueAttackMove(entityIds, targetX, targetY) {
      onIssueCommand({
        type: CommandType.ATTACK_MOVE,
        entityIds,
        playerIndex,
        tick: getNextTick(),
        targetX,
        targetY,
      });
    },

    issueStop(entityIds) {
      onIssueCommand({
        type: CommandType.STOP,
        entityIds,
        playerIndex,
        tick: getNextTick(),
      });
    },

    issueHold(entityIds) {
      onIssueCommand({
        type: CommandType.HOLD,
        entityIds,
        playerIndex,
        tick: getNextTick(),
      });
    },

    issueProduceUnit(producerEntityId, unitId) {
      onIssueCommand({
        type: CommandType.PRODUCE_UNIT,
        entityIds: [producerEntityId],
        playerIndex,
        tick: getNextTick(),
        producerEntityId,
        unitId,
      });
    },

    issueBuildStructure(structureId, gridX, gridY) {
      onIssueCommand({
        type: CommandType.BUILD_STRUCTURE,
        entityIds: [],
        playerIndex,
        tick: getNextTick(),
        structureId,
        gridX,
        gridY,
      });
    },

    issueCancelProduction(producerEntityId, queueIndex) {
      onIssueCommand({
        type: CommandType.CANCEL_PRODUCTION,
        entityIds: [producerEntityId],
        playerIndex,
        tick: getNextTick(),
        producerEntityId,
        queueIndex,
      });
    },

    issueSellStructure(structureEntityId) {
      onIssueCommand({
        type: CommandType.SELL_STRUCTURE,
        entityIds: [structureEntityId],
        playerIndex,
        tick: getNextTick(),
        structureEntityId,
      });
    },

    issueRepairStructure(structureEntityId) {
      onIssueCommand({
        type: CommandType.REPAIR_STRUCTURE,
        entityIds: [structureEntityId],
        playerIndex,
        tick: getNextTick(),
        structureEntityId,
      });
    },

    issueGather(entityIds) {
      onIssueCommand({
        type: CommandType.GATHER,
        entityIds,
        playerIndex,
        tick: getNextTick(),
      });
    },
  }), [onIssueCommand, playerIndex, getNextTick]);
}
