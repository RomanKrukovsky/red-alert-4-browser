export class SimEventEmitter {
    listeners = new Map();
    on(event, callback) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(callback);
        // Return unsubscribe function
        return () => {
            set?.delete(callback);
        };
    }
    emit(event, data) {
        const set = this.listeners.get(event);
        if (set) {
            for (const cb of set) {
                cb(data);
            }
        }
    }
    clear() {
        this.listeners.clear();
    }
}
//# sourceMappingURL=eventEmitter.js.map