import { GameSimulation } from '@ra4/sim-core';
import { decodeReplay, ReplayFormatError } from './format.js';
/**
 * Replay v2 player — deterministic re-simulation of the command log.
 *
 * step() advances one tick, applying recorded commands at their exact
 * ticks and validating recorded checkpoints as it passes them.
 * seekToTick() re-simulates from tick 0 (exactness beats keyframe
 * approximation; keyframes exist for instant scrub *previews* in the UI).
 */
export class ReplayPlayerV2 {
    data;
    sim;
    currentTick = 0;
    frameIndex = 0;
    checkpointIndex = 0;
    divergenceTick = null;
    checkpointsChecked = 0;
    lastDivergence = null;
    constructor(bytes) {
        this.data = decodeReplay(bytes);
        this.sim = this.freshSim();
    }
    freshSim() {
        // The header's map is part of the recorded match identity: replaying on
        // a different map changes spawns and resource nodes, so the command log
        // would diverge immediately.
        const sim = new GameSimulation(this.data.header.seed, undefined, undefined, this.data.header.mapId);
        sim.initMatch(this.data.header.players, this.data.header.startingCredits);
        return sim;
    }
    get durationTicks() {
        return this.data.header.durationTicks;
    }
    /** Advance exactly one tick. Returns false when the replay is exhausted. */
    step() {
        if (this.currentTick >= this.data.header.durationTicks)
            return false;
        // Convention: frame.tick is the POST-step tick index the recorder saw
        // (commands were applied immediately before that step). So commands for
        // frame.tick T are applied when currentTick === T - 1.
        const frame = this.data.frames[this.frameIndex];
        if (frame && frame.tick === this.currentTick + 1) {
            this.sim.processCommands(frame.commands);
            this.frameIndex++;
        }
        this.sim.step();
        this.currentTick++;
        const cp = this.data.checkpoints[this.checkpointIndex];
        if (cp && cp.tick === this.currentTick) {
            this.checkpointIndex++;
            this.checkpointsChecked++;
            const actual = this.sim.calculateChecksum();
            if (actual !== cp.checksum && this.divergenceTick === null) {
                this.divergenceTick = this.currentTick;
                this.lastDivergence = { expected: cp.checksum, actual };
            }
        }
        return true;
    }
    /** Nearest keyframe snapshot at or before the tick — for instant UI preview. */
    previewAt(tick) {
        let best = null;
        for (const kf of this.data.keyframes) {
            if (kf.tick <= tick)
                best = kf.snapshot;
            else
                break;
        }
        return best;
    }
    /** Exact seek: deterministic re-simulation from tick 0 to the target tick. */
    seekToTick(targetTick) {
        const clamped = Math.max(0, Math.min(targetTick, this.data.header.durationTicks));
        if (clamped < this.currentTick) {
            this.sim = this.freshSim();
            this.currentTick = 0;
            this.frameIndex = 0;
            this.checkpointIndex = 0;
            this.divergenceTick = null;
            this.lastDivergence = null;
            this.checkpointsChecked = 0;
        }
        while (this.currentTick < clamped) {
            if (!this.step())
                break;
        }
    }
    /** Play the whole replay headlessly and report checkpoint verification. */
    verify() {
        this.seekToTick(0);
        while (this.step()) { /* run to end */ }
        return {
            verified: this.divergenceTick === null && this.checkpointsChecked > 0,
            checkpointsChecked: this.checkpointsChecked,
            firstDivergenceTick: this.divergenceTick,
            ...(this.lastDivergence ? { expectedChecksum: this.lastDivergence.expected, actualChecksum: this.lastDivergence.actual } : {}),
        };
    }
}
export { ReplayFormatError };
//# sourceMappingURL=player.js.map