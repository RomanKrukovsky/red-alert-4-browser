import { MatchState, WorldSnapshot } from '@ra4/shared-types';
import { useUIStore } from '@ra4/ui';
import type { SimFrame } from '../sim/SimWorkerClient.js';
import type { RTSRenderer } from '../renderer.js';
import { VoiceManager } from '../audio/voiceManager.js';

interface EntityDigest {
  hp: number;
  isBuilding: boolean;
  specId: string;
  playerIndex: number;
}

export interface FrameHandlerDeps {
  renderer: RTSRenderer;
  /** Called once, on the first frame that reaches the client. */
  onFirstFrame: () => void;
  /** Called when the simulation reports a finished match. */
  onMatchFinished: (winnerTeam: number) => void;
}

/**
 * Builds the per-frame presentation handler shared by the local skirmish and
 * the server-authoritative multiplayer paths.
 *
 * Responsibilities: push the snapshot into the renderer and UI store, and
 * derive EVA/voice events by diffing consecutive snapshots. It contains no
 * simulation logic — the snapshot is the only input.
 */
export function createFrameHandler(deps: FrameHandlerDeps): (frame: SimFrame) => void {
  let prevEntities = new Map<number, EntityDigest>();
  let firstFrameSeen = false;
  let finished = false;

  return (frame: SimFrame): void => {
    const snapshot: WorldSnapshot = frame.snapshot;
    deps.renderer.updateScene(snapshot);
    useUIStore.getState().setSnapshot(snapshot);

    const activePlayerIdx = useUIStore.getState().activePlayerIndex;
    const currentEntities = new Map<number, EntityDigest>();

    for (const ent of snapshot.entities) {
      currentEntities.set(ent.id, { hp: ent.hp, isBuilding: ent.isBuilding, specId: ent.specId, playerIndex: ent.playerIndex });

      if (prevEntities.size > 0 && !prevEntities.has(ent.id)) {
        if (ent.playerIndex === activePlayerIdx) {
          VoiceManager.getInstance().playEVAMessage(ent.isBuilding ? 'BUILDING_COMPLETE' : 'UNIT_READY');
        }
      } else if (prevEntities.has(ent.id)) {
        const prev = prevEntities.get(ent.id)!;
        if (ent.playerIndex === activePlayerIdx && ent.hp < prev.hp - 15) {
          if (ent.isBuilding) {
            VoiceManager.getInstance().playEVAMessage('BASE_UNDER_ATTACK', undefined, 8000);
          } else {
            VoiceManager.getInstance().playUnitBark(ent.specId, 'Damaged');
          }
        }
      }
    }

    if (prevEntities.size > 0) {
      for (const [id, prev] of prevEntities.entries()) {
        if (!currentEntities.has(id) && prev.playerIndex === activePlayerIdx && !prev.isBuilding) {
          VoiceManager.getInstance().playUnitBark(prev.specId, 'Death');
          VoiceManager.getInstance().playEVAMessage('UNIT_LOST', undefined, 4000);
        }
      }
    }

    prevEntities = currentEntities;

    if (frame.matchState === MatchState.FINISHED && !finished) {
      finished = true;
      deps.onMatchFinished(frame.winnerTeam);
      return;
    }

    if (!firstFrameSeen) {
      firstFrameSeen = true;
      VoiceManager.getInstance().playEVAMessage('MATCH_START');
      deps.onFirstFrame();
    }
  };
}

export const hudHashForFaction = (factionId: string): string => {
  switch (factionId) {
    case 'AL': return '#/hud/allies';
    case 'CO': return '#/hud/coalition';
    case 'CH': return '#/hud/chronolegion';
    default: return '#/hud/soviet';
  }
};
