export class Mulberry32PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextInt(): number {
    let z = (this.state += 0x6d2b79f5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return (z ^ (z >>> 14)) >>> 0;
  }

  public nextRange(min: number, max: number): number {
    if (min >= max) return min;
    const diff = max - min + 1;
    return min + (this.nextInt() % diff);
  }

  public getSeedState(): number {
    return this.state;
  }
}
