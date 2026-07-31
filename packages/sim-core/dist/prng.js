export class Mulberry32PRNG {
    state;
    constructor(seed) {
        this.state = seed >>> 0;
    }
    nextInt() {
        let z = (this.state += 0x6d2b79f5);
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return (z ^ (z >>> 14)) >>> 0;
    }
    nextRange(min, max) {
        if (min >= max)
            return min;
        const diff = max - min + 1;
        return min + (this.nextInt() % diff);
    }
    getSeedState() {
        return this.state;
    }
}
//# sourceMappingURL=prng.js.map