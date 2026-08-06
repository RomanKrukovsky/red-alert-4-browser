import { PlayerCommand } from '@ra4/shared-types';
import { GameSimulation } from '@ra4/sim-core';
export interface ValidationResult {
    valid: boolean;
    reason?: string;
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
export declare function validatePlayerCommand(cmd: PlayerCommand, sim: GameSimulation, playerIndex: number): ValidationResult;
//# sourceMappingURL=validator.d.ts.map