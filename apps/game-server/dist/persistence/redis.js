"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisConnected = exports.redisClient = void 0;
exports.initRedis = initRedis;
exports.closeRedis = closeRedis;
exports.cacheSet = cacheSet;
exports.cacheGet = cacheGet;
exports.cacheDel = cacheDel;
const ioredis_1 = __importDefault(require("ioredis"));
const env_js_1 = require("../config/env.js");
exports.redisClient = null;
exports.isRedisConnected = false;
const inMemoryCache = new Map();
async function initRedis() {
    try {
        const client = new ioredis_1.default(env_js_1.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: true,
        });
        await client.connect();
        await client.ping();
        exports.redisClient = client;
        exports.isRedisConnected = true;
        console.log('[Redis] Redis connected successfully.');
        return true;
    }
    catch (error) {
        console.warn('[Redis] Could not connect to Redis. Operating with in-memory fallback cache:', error.message);
        exports.isRedisConnected = false;
        return false;
    }
}
async function closeRedis() {
    if (exports.redisClient) {
        await exports.redisClient.quit();
        exports.isRedisConnected = false;
    }
}
async function cacheSet(key, value, ttlSeconds) {
    if (exports.isRedisConnected && exports.redisClient) {
        if (ttlSeconds) {
            await exports.redisClient.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await exports.redisClient.set(key, value);
        }
    }
    else {
        inMemoryCache.set(key, value);
    }
}
async function cacheGet(key) {
    if (exports.isRedisConnected && exports.redisClient) {
        return await exports.redisClient.get(key);
    }
    else {
        return inMemoryCache.get(key) ?? null;
    }
}
async function cacheDel(key) {
    if (exports.isRedisConnected && exports.redisClient) {
        await exports.redisClient.del(key);
    }
    else {
        inMemoryCache.delete(key);
    }
}
//# sourceMappingURL=redis.js.map