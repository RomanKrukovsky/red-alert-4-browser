export enum AIDecisionLane {
  STRATEGY = 'STRATEGY',
  ECONOMY = 'ECONOMY',
  PRODUCTION = 'PRODUCTION',
  TACTICAL = 'TACTICAL'
}

export interface AIEntityObservation {
  id: number;
  specId: string;
  isBuilding: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  playerIndex: number;
}

export class AIScheduler {
  public constructor(
    private readonly difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'HARD_FAIR' = 'HARD_FAIR'
  ) {}

  private scaleInterval(normalInterval: number, hardInterval: number = normalInterval): number {
    if (this.difficulty === 'EASY') return normalInterval * 2;
    if (this.difficulty === 'HARD' || this.difficulty === 'HARD_FAIR') return hardInterval;
    return normalInterval;
  }

  public shouldRunWorldModel(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3) % this.scaleInterval(15, 10) === 0;
  }

  public shouldRunEconomy(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3) % this.scaleInterval(30) === 0;
  }

  public shouldRunBasePlanner(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3 + 5) % this.scaleInterval(45) === 0;
  }

  public shouldRunProduction(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3 + 10) % this.scaleInterval(30) === 0;
  }

  public shouldRunTactical(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 2) % this.scaleInterval(5, 3) === 0;
  }
}
