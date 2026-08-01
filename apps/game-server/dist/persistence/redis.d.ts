import Redis from 'ioredis';
export declare let redisClient: Redis | null;
export declare let isRedisConnected: boolean;
export declare function initRedis(): Promise<boolean>;
export declare function closeRedis(): Promise<void>;
export declare function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void>;
export declare function cacheGet(key: string): Promise<string | null>;
export declare function cacheDel(key: string): Promise<void>;
//# sourceMappingURL=redis.d.ts.map