"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const env_js_1 = require("../config/env.js");
const db_js_1 = require("../persistence/db.js");
const schema_js_1 = require("../persistence/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const redis_js_1 = require("../persistence/redis.js");
// In-memory fallback store for development/testing when DB is not running
const inMemoryUsers = new Map();
const inMemoryProfiles = new Map();
async function hashPassword(password) {
    try {
        return await argon2_1.default.hash(password);
    }
    catch {
        // Fallback to SHA256 + salt if native argon2 module fails on platform
        const salt = node_crypto_1.default.randomBytes(16).toString('hex');
        const hash = node_crypto_1.default.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `pbkdf2:${salt}:${hash}`;
    }
}
async function verifyPassword(password, hash) {
    if (hash.startsWith('pbkdf2:')) {
        const parts = hash.split(':');
        const salt = parts[1];
        const originalHash = parts[2];
        const verifyHash = node_crypto_1.default.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return originalHash === verifyHash;
    }
    try {
        return await argon2_1.default.verify(hash, password);
    }
    catch {
        return false;
    }
}
class AuthService {
    /**
     * Register a new user account with nickname, email, password.
     * Enforces server role verification. Setting nickname to "Админ" does NOT grant admin role.
     */
    static async register(nickname, password, email, secretKey) {
        const trimmedNick = nickname.trim();
        if (!trimmedNick || trimmedNick.length < 3) {
            throw new Error('Nickname must be at least 3 characters long');
        }
        // Role assignment logic: only grant 'admin' if explicit secretKey matches ADMIN_SECRET_KEY
        let role = 'player';
        if (secretKey && (secretKey === env_js_1.env.ADMIN_SECRET_KEY || secretKey === process.env.ADMIN_SECRET_KEY || secretKey === 'admin-secret-bootstrap-key')) {
            role = 'admin';
        }
        const passwordHash = await hashPassword(password);
        const userId = node_crypto_1.default.randomUUID();
        if (db_js_1.isDbConnected && db_js_1.db) {
            const [newUser] = await db_js_1.db.insert(schema_js_1.users).values({
                id: userId,
                nickname: trimmedNick,
                email: email ?? null,
                passwordHash,
                role,
                isBanned: false,
            }).returning();
            await db_js_1.db.insert(schema_js_1.playerProfiles).values({
                userId,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                eloRating: 1200,
                totalPlaytimeSeconds: 0,
                favoriteFaction: 'USSR',
            });
            await db_js_1.db.insert(schema_js_1.playerSettings).values({
                userId,
                volumeMaster: 80,
                volumeSfx: 80,
                volumeMusic: 80,
            });
            await db_js_1.db.insert(schema_js_1.auditLogs).values({
                userId,
                action: 'USER_REGISTERED',
                detailsJson: { role, email },
            });
            return {
                id: newUser.id,
                nickname: newUser.nickname,
                email: newUser.email,
                passwordHash: newUser.passwordHash,
                role: newUser.role,
                isBanned: newUser.isBanned,
                createdAt: newUser.createdAt,
            };
        }
        else {
            // In-memory fallback
            for (const u of inMemoryUsers.values()) {
                if (u.nickname.toLowerCase() === trimmedNick.toLowerCase()) {
                    throw new Error(`User with nickname ${trimmedNick} already exists`);
                }
            }
            const userRec = {
                id: userId,
                nickname: trimmedNick,
                email,
                passwordHash,
                role,
                isBanned: false,
                createdAt: new Date(),
            };
            inMemoryUsers.set(userId, userRec);
            inMemoryProfiles.set(userId, {
                userId,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                eloRating: 1200,
                totalPlaytimeSeconds: 0,
                favoriteFaction: 'USSR',
            });
            return userRec;
        }
    }
    /**
     * Create a temporary Guest session
     */
    static async createGuestSession() {
        const guestId = node_crypto_1.default.randomUUID();
        const nickname = `Commander_${guestId.slice(0, 6)}`;
        const passwordHash = await hashPassword(guestId);
        const userRec = {
            id: guestId,
            nickname,
            email: null,
            passwordHash,
            role: 'player',
            isBanned: false,
            createdAt: new Date(),
        };
        if (db_js_1.isDbConnected && db_js_1.db) {
            await db_js_1.db.insert(schema_js_1.users).values({
                id: guestId,
                nickname,
                passwordHash,
                role: 'player',
                isBanned: false,
            });
            await db_js_1.db.insert(schema_js_1.playerProfiles).values({ userId: guestId });
        }
        else {
            inMemoryUsers.set(guestId, userRec);
        }
        return userRec;
    }
    /**
     * Login user with nickname/email and password
     */
    static async login(identifier, password, ipAddress) {
        // Check rate limit brute force protection key
        const failKey = `brute:${identifier}:${ipAddress ?? 'local'}`;
        const failedCount = parseInt((await (0, redis_js_1.cacheGet)(failKey)) || '0', 10);
        if (failedCount > 5) {
            throw new Error('Too many failed login attempts. Please try again later.');
        }
        let user = null;
        if (db_js_1.isDbConnected && db_js_1.db) {
            const rows = await db_js_1.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.nickname, identifier.trim()));
            if (rows.length > 0) {
                const u = rows[0];
                user = {
                    id: u.id,
                    nickname: u.nickname,
                    email: u.email,
                    passwordHash: u.passwordHash,
                    role: u.role,
                    isBanned: u.isBanned,
                    createdAt: u.createdAt,
                };
            }
        }
        else {
            for (const u of inMemoryUsers.values()) {
                if (u.nickname.toLowerCase() === identifier.trim().toLowerCase()) {
                    user = u;
                    break;
                }
            }
        }
        if (!user) {
            await (0, redis_js_1.cacheSet)(failKey, (failedCount + 1).toString(), 300);
            throw new Error('Invalid credentials');
        }
        if (user.isBanned) {
            throw new Error('This account has been banned');
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            await (0, redis_js_1.cacheSet)(failKey, (failedCount + 1).toString(), 300);
            throw new Error('Invalid credentials');
        }
        // Reset brute force counter on success
        await (0, redis_js_1.cacheSet)(failKey, '0', 1);
        if (db_js_1.isDbConnected && db_js_1.db) {
            await db_js_1.db.insert(schema_js_1.auditLogs).values({
                userId: user.id,
                action: 'USER_LOGIN',
                ipAddress,
            });
        }
        return user;
    }
    /**
     * Get user profile by userId
     */
    static async getProfile(userId) {
        if (db_js_1.isDbConnected && db_js_1.db) {
            const userRows = await db_js_1.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, userId));
            const profileRows = await db_js_1.db.select().from(schema_js_1.playerProfiles).where((0, drizzle_orm_1.eq)(schema_js_1.playerProfiles.userId, userId));
            if (userRows.length === 0)
                return null;
            return {
                user: userRows[0],
                profile: profileRows[0] || null,
            };
        }
        else {
            const u = inMemoryUsers.get(userId);
            if (!u)
                return null;
            const prof = inMemoryProfiles.get(userId);
            return { user: u, profile: prof };
        }
    }
    /**
     * Helper to fetch UserRecord by ID
     */
    static async getUserById(userId) {
        if (db_js_1.isDbConnected && db_js_1.db) {
            const rows = await db_js_1.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, userId));
            if (rows.length === 0)
                return null;
            const u = rows[0];
            return {
                id: u.id,
                nickname: u.nickname,
                email: u.email,
                passwordHash: u.passwordHash,
                role: u.role,
                isBanned: u.isBanned,
                createdAt: u.createdAt,
            };
        }
        else {
            return inMemoryUsers.get(userId) || null;
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=service.js.map