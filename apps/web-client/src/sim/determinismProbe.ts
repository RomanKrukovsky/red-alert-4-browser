import { FactionId, PlayerType } from '@ra4/shared-types';
import type { MainToWorkerMessage, WorkerToMainMessage } from './workerProtocol.js';

/**
 * QA hook: exposes `window.__RA4_DETERMINISM_PROBE__(seed, ticks)` which runs
 * the canonical determinism scenario inside a real simulation Web Worker and
 * resolves with the final checksum. The Node side of the gate runs the same
 * scenario in-process; CI asserts the checksums are identical.
 *
 * The player configuration below MUST stay in sync with
 * packages/testing/src/crossEnvDeterminism.ts.
 */
export function installDeterminismProbe(): void {
  (window as any).__RA4_DETERMINISM_PROBE__ = (seed: number, ticks: number): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Determinism probe timed out'));
      }, 120_000);

      worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
        const msg = event.data;
        if (msg.type === 'READY') {
          const probe: MainToWorkerMessage = {
            type: 'RUN_DETERMINISM_PROBE',
            ticks,
            config: {
              seed,
              players: [
                { name: 'Player 1 (USSR)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
                { name: 'Player 2 (Alliance)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 },
              ],
            },
          };
          worker.postMessage(probe);
        } else if (msg.type === 'DETERMINISM_PROBE_RESULT') {
          clearTimeout(timeout);
          worker.terminate();
          resolve(msg.checksum);
        } else if (msg.type === 'ERROR') {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(msg.message));
        }
      };
    });
  };
}
