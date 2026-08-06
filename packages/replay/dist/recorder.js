import { encodeReplay, REPLAY_FORMAT_VERSION, } from './format.js';
/**
 * Replay v2 recorder. The host (match server / local match) calls
 * `recordTick` after every executed simulation tick with the commands that
 * were applied on that tick. Checkpoints and keyframes are captured from
 * the live simulation on their intervals.
 */
export class ReplayRecorderV2 {
    config;
    frames = [];
    checkpoints = [];
    keyframes = [];
    durationTicks = 0;
    result = null;
    checkpointInterval;
    keyframeInterval;
    constructor(config) {
        this.config = config;
        this.checkpointInterval = config.checkpointIntervalTicks ?? 300;
        this.keyframeInterval = config.keyframeIntervalTicks ?? 1800;
    }
    recordTick(sim, tick, commands) {
        if (commands.length > 0) {
            this.frames.push({ tick, commands: commands.map((c) => ({ ...c })) });
        }
        if (tick % this.checkpointInterval === 0) {
            this.checkpoints.push({ tick, checksum: sim.calculateChecksum() });
        }
        if (tick % this.keyframeInterval === 0) {
            this.keyframes.push({ tick, snapshot: sim.createSnapshot() });
        }
        this.durationTicks = tick;
    }
    recordResult(winnerTeam, reason) {
        this.result = { winnerTeam, reason };
    }
    export() {
        const header = {
            formatVersion: REPLAY_FORMAT_VERSION,
            simVersion: this.config.simVersion,
            contentHash: this.config.contentHash,
            protocolVersion: this.config.protocolVersion,
            mapId: this.config.mapId,
            seed: this.config.seed,
            tickRate: this.config.tickRate,
            players: this.config.players,
            startingCredits: this.config.startingCredits,
            durationTicks: this.durationTicks,
            result: this.result,
            recordedAtIso: this.config.recordedAtIso,
        };
        const data = {
            header,
            frames: this.frames,
            checkpoints: this.checkpoints,
            keyframes: this.keyframes,
        };
        return encodeReplay(data);
    }
}
//# sourceMappingURL=recorder.js.map