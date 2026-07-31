import { EntityStateSnapshot, PlayerEconomyState } from '@ra4/shared-types';

export type SimEventMap = {
  EntityCreated: { entity: EntityStateSnapshot };
  EntityDestroyed: { entityId: number; playerIndex: number };
  HealthChanged: { entityId: number; hp: number; maxHp: number; shield: number };
  ResourceChanged: { playerIndex: number; credits: number; powerLow: boolean };
  ProductionStarted: { producerId: number; specId: string };
  ProductionCompleted: { producerId: number; specId: string; createdEntityId: number };
  MatchWon: { winnerTeam: number; winnerPlayerIndex: number };
  MatchLost: { playerIndex: number };
};

export type SimEventCallback<K extends keyof SimEventMap> = (data: SimEventMap[K]) => void;

export class SimEventEmitter {
  private listeners: Map<keyof SimEventMap, Set<SimEventCallback<any>>> = new Map();

  public on<K extends keyof SimEventMap>(event: K, callback: SimEventCallback<K>): () => void {
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

  public emit<K extends keyof SimEventMap>(event: K, data: SimEventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        cb(data);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
