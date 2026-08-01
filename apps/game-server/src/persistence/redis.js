import Redis from 'ioredis';
import { env } from '../config/env.js';
export let redisClient = null;
export let isRedisConnected = false;
const inMemoryCache = new Map();
export async function initRedis() {
    try {
        const client = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: true,
        });
        await client.connect();
        await client.ping();
        redisClient = client;
        isRedisConnected = true;
        console.log('[Redis] Redis connected successfully.');
        return true;
    }
    catch (error) {
        console.warn('[Redis] Could not connect to Redis. Operating with in-memory fallback cache:', error.message);
        isRedisConnected = false;
        return false;
    }
}
export async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        isRedisConnected = false;
    }
}
export async function cacheSet(key, value, ttlSeconds) {
    if (isRedisConnected && redisClient) {
        if (ttlSeconds) {
            await redisClient.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await redisClient.set(key, value);
        }
    }
    else {
        inMemoryCache.set(key, value);
    }
}
export async function cacheGet(key) {
    if (isRedisConnected && redisClient) {
        return await redisClient.get(key);
    }
    else {
        return inMemoryCache.get(key) ?? null;
    }
}
export async function cacheDel(key) {
    if (isRedisConnected && redisClient) {
        await redisClient.del(key);
    }
    else {
        inMemoryCache.delete(key);
    }
}
//# sourceMappingURL=redis.js.map