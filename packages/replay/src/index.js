import { GameSimulation } from '@ra4/sim-core';
export class ReplayRecorder {
    header;
    frames = [];
    constructor(header) {
        this.header = header;
    }
    recordTick(tick, commands) {
        if (commands.length > 0) {
            this.frames.push({ tick, commands });
        }
        this.header.durationTicks = tick;
    }
    exportJSON() {
        return JSON.stringify({
            header: this.header,
            frames: this.frames
        }, null, 2);
    }
}
export class ReplayPlayer {
    data;
    sim;
    currentTick = 0;
    frameIndex = 0;
    constructor(replayJson) {
        this.data = JSON.parse(replayJson);
        this.sim = new GameSimulation(this.data.header.seed);
        this.sim.initMatch(this.data.header.players);
    }
    step() {
        if (this.currentTick >= this.data.header.durationTicks) {
            return false;
        }
        const currentFrame = this.data.frames[this.frameIndex];
        if (currentFrame && currentFrame.tick === this.currentTick) {
            this.sim.processCommands(currentFrame.commands);
            this.frameIndex++;
        }
        this.sim.step();
        this.currentTick++;
        return true;
    }
}
//# sourceMappingURL=index.js.map