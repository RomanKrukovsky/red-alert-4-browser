export class AIScheduler {
  public shouldRunWorldModel(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3) % 15 === 0;
  }

  public shouldRunEconomy(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3) % 30 === 0;
  }

  public shouldRunBasePlanner(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3 + 5) % 45 === 0;
  }

  public shouldRunProduction(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 3 + 10) % 30 === 0;
  }

  public shouldRunTactical(tickIndex: number, playerIndex: number): boolean {
    return (tickIndex + playerIndex * 2) % 5 === 0;
  }
}
