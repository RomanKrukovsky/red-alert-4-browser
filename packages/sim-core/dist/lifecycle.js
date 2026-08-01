import { GameSimulation } from './simulation.js';
import { CommandBus } from './commandBus.js';
import { SimEventEmitter } from './eventEmitter.js';
export var MatchLifecycleState;
(function (MatchLifecycleState) {
    MatchLifecycleState["UNINITIALIZED"] = "UNINITIALIZED";
    MatchLifecycleState["INITIALIZED"] = "INITIALIZED";
    MatchLifecycleState["RUNNING"] = "RUNNING";
    MatchLifecycleState["PAUSED"] = "PAUSED";
    MatchLifecycleState["STOPPED"] = "STOPPED";
    MatchLifecycleState["DISPOSED"] = "DISPOSED";
})(MatchLifecycleState || (MatchLifecycleState = {}));
export class MatchLifecycleManager {
    state = MatchLifecycleState.UNINITIALIZED;
    sim = null;
    commandBus = new CommandBus();
    events = new SimEventEmitter();
    tickMs = 33.33; // 30 ticks per second
    accumulator = 0;
    lastTime = 0;
    animationFrameId = null;
    catchUpLimit = 5; // max ticks per frame to prevent spiral of death
    initialize(config) {
        if (this.state !== MatchLifecycleState.UNINITIALIZED && this.state !== MatchLifecycleState.STOPPED) {
            this.dispose();
        }
        const seed = config.seed ?? 1337;
        this.tickMs = 1000 / (config.tickRate ?? 30);
        this.sim = new GameSimulation(seed);
        this.sim.initMatch(config.players, config.startingCredits);
        this.state = MatchLifecycleState.INITIALIZED;
    }
    start(onTickRender) {
        if (this.state !== MatchLifecycleState.INITIALIZED && this.state !== MatchLifecycleState.PAUSED) {
            throw new Error(`Cannot start match in state: ${this.state}`);
        }
        this.state = MatchLifecycleState.RUNNING;
        this.lastTime = performance.now();
        this.accumulator = 0;
        const gameLoop = (currentTime) => {
            if (this.state !== MatchLifecycleState.RUNNING)
                return;
            const delta = currentTime - this.lastTime;
            this.lastTime = currentTime;
            this.accumulator += delta;
            let ticksExecuted = 0;
            let snapshot = null;
            while (this.accumulator >= this.tickMs && ticksExecuted < this.catchUpLimit) {
                if (this.sim) {
                    const pendingCmds = this.commandBus.flush();
                    this.sim.processCommands(pendingCmds);
                    snapshot = this.sim.step();
                }
                this.accumulator -= this.tickMs;
                ticksExecuted++;
            }
            // Spiral of death prevention reset
            if (this.accumulator > this.tickMs * this.catchUpLimit) {
                this.accumulator = 0;
            }
            const alphaInterp = Math.min(1.0, Math.max(0.0, this.accumulator / this.tickMs));
            if (onTickRender && snapshot) {
                onTickRender(snapshot, alphaInterp);
            }
            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        this.animationFrameId = requestAnimationFrame(gameLoop);
    }
    pause() {
        if (this.state === MatchLifecycleState.RUNNING) {
            this.state = MatchLifecycleState.PAUSED;
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }
    }
    resume(onTickRender) {
        if (this.state === MatchLifecycleState.PAUSED) {
            this.start(onTickRender);
        }
    }
    stop() {
        this.state = MatchLifecycleState.STOPPED;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    dispose() {
        this.stop();
        this.commandBus.clear();
        this.events.clear();
        this.sim = null;
        this.state = MatchLifecycleState.DISPOSED;
    }
}
//# sourceMappingURL=lifecycle.js.map