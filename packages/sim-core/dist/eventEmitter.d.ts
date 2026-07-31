import { EntityStateSnapshot } from '@ra4/shared-types';
export type SimEventMap = {
    EntityCreated: {
        entity: EntityStateSnapshot;
    };
    EntityDestroyed: {
        entityId: number;
        playerIndex: number;
    };
    HealthChanged: {
        entityId: number;
        hp: number;
        maxHp: number;
        shield: number;
    };
    ResourceChanged: {
        playerIndex: number;
        credits: number;
        powerLow: boolean;
    };
    ProductionStarted: {
        producerId: number;
        specId: string;
    };
    ProductionCompleted: {
        producerId: number;
        specId: string;
        createdEntityId: number;
    };
    MatchWon: {
        winnerTeam: number;
        winnerPlayerIndex: number;
    };
    MatchLost: {
        playerIndex: number;
    };
};
export type SimEventCallback<K extends keyof SimEventMap> = (data: SimEventMap[K]) => void;
export declare class SimEventEmitter {
    private listeners;
    on<K extends keyof SimEventMap>(event: K, callback: SimEventCallback<K>): () => void;
    emit<K extends keyof SimEventMap>(event: K, data: SimEventMap[K]): void;
    clear(): void;
}
//# sourceMappingURL=eventEmitter.d.ts.map