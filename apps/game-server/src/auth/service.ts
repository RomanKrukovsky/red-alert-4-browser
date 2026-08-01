import argon2 from 'argon2';
import crypto from 'node:crypto';
import { db, isDbConnected } from '../persistence/db.js';
import { users, sessions, playerProfiles, playerSettings, auditLogs } from '../persistence/schema.js';
import { eq } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../persistence/redis.js';

export type UserRole = 'player' | 'moderator' | 'admin';

export interface UserRecord {
  id: string;
  nickname: string;
  email?: string | null;
  passwordHash: string;
  role: UserRole;
  isBanned: boolean;
  createdAt: Date;
}

export interface AuthSession {
  userId: string;
  nickname: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

// In-memory fallback store for development/testing when DB is not running
const inMemoryUsers = new Map<string, UserRecord>();
const inMemoryProfiles = new Map<string, any>();

async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password);
  } catch {
    // Fallback to SHA256 + salt if native argon2 module fails on platform
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `pbkdf2:${salt}:${hash}`;
  }
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('pbkdf2:')) {
    const parts = hash.split(':');
    const salt = parts[1];
    const originalHash = parts[2];
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return originalHash === verifyHash;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export class AuthService {
  /**
   * Register a new user account with nickname, email, password.
   * Enforces server role verification. Setting nickname to "Админ" does NOT grant admin role.
   */
  public static async register(nickname: string, password: string, email?: string, secretKey?: string): Promise<UserRecord> {
    const trimmedNick = nickname.trim();
    if (!trimmedNick || trimmedNick.length < 3) {
      throw new Error('Nickname must be at least 3 characters long');
    }

    // Role assignment logic: only grant 'admin' if explicit secretKey matches ADMIN_SECRET_KEY
    let role: UserRole = 'player';
    if (secretKey && secretKey === process.env.ADMIN_SECRET_KEY) {
      role = 'admin';
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    if (isDbConnected && db) {
      const [newUser] = await db.insert(users).values({
        id: userId,
        nickname: trimmedNick,
        email: email ?? null,
        passwordHash,
        role,
        isBanned: false,
      }).returning();

      await db.insert(playerProfiles).values({
        userId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        eloRating: 1200,
        totalPlaytimeSeconds: 0,
        favoriteFaction: 'USSR',
      });

      await db.insert(playerSettings).values({
        userId,
        volumeMaster: 80,
        volumeSfx: 80,
        volumeMusic: 80,
      });

      await db.insert(auditLogs).values({
        userId,
        action: 'USER_REGISTERED',
        detailsJson: { role, email },
      });

      return {
        id: newUser.id,
        nickname: newUser.nickname,
        email: newUser.email,
        passwordHash: newUser.passwordHash,
        role: newUser.role as UserRole,
        isBanned: newUser.isBanned,
        createdAt: newUser.createdAt,
      };
    } else {
      // In-memory fallback
      for (const u of inMemoryUsers.values()) {
        if (u.nickname.toLowerCase() === trimmedNick.toLowerCase()) {
          throw new Error(`User with nickname ${trimmedNick} already exists`);
        }
      }

      const userRec: UserRecord = {
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
  public static async createGuestSession(): Promise<UserRecord> {
    const guestId = crypto.randomUUID();
    const nickname = `Commander_${guestId.slice(0, 6)}`;
    const passwordHash = await hashPassword(guestId);

    const userRec: UserRecord = {
      id: guestId,
      nickname,
      email: null,
      passwordHash,
      role: 'player',
      isBanned: false,
      createdAt: new Date(),
    };

    if (isDbConnected && db) {
      await db.insert(users).values({
        id: guestId,
        nickname,
        passwordHash,
        role: 'player',
        isBanned: false,
      });
      await db.insert(playerProfiles).values({ userId: guestId });
    } else {
      inMemoryUsers.set(guestId, userRec);
    }

    return userRec;
  }

  /**
   * Login user with nickname/email and password
   */
  public static async login(identifier: string, password: string, ipAddress?: string): Promise<UserRecord> {
    // Check rate limit brute force protection key
    const failKey = `brute:${identifier}:${ipAddress ?? 'local'}`;
    const failedCount = parseInt((await cacheGet(failKey)) || '0', 10);
    if (failedCount > 5) {
      throw new Error('Too many failed login attempts. Please try again later.');
    }

    let user: UserRecord | null = null;

    if (isDbConnected && db) {
      const rows = await db.select().from(users).where(eq(users.nickname, identifier.trim()));
      if (rows.length > 0) {
        const u = rows[0];
        user = {
          id: u.id,
          nickname: u.nickname,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role as UserRole,
          isBanned: u.isBanned,
          createdAt: u.createdAt,
        };
      }
    } else {
      for (const u of inMemoryUsers.values()) {
        if (u.nickname.toLowerCase() === identifier.trim().toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      await cacheSet(failKey, (failedCount + 1).toString(), 300);
      throw new Error('Invalid credentials');
    }

    if (user.isBanned) {
      throw new Error('This account has been banned');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await cacheSet(failKey, (failedCount + 1).toString(), 300);
      throw new Error('Invalid credentials');
    }

    // Reset brute force counter on success
    await cacheSet(failKey, '0', 1);

    if (isDbConnected && db) {
      await db.insert(auditLogs).values({
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
  public static async getProfile(userId: string) {
    if (isDbConnected && db) {
      const userRows = await db.select().from(users).where(eq(users.id, userId));
      const profileRows = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
      if (userRows.length === 0) return null;
      return {
        user: userRows[0],
        profile: profileRows[0] || null,
      };
    } else {
      const u = inMemoryUsers.get(userId);
      if (!u) return null;
      const prof = inMemoryProfiles.get(userId);
      return { user: u, profile: prof };
    }
  }

  /**
   * Helper to fetch UserRecord by ID
   */
  public static async getUserById(userId: string): Promise<UserRecord | null> {
    if (isDbConnected && db) {
      const rows = await db.select().from(users).where(eq(users.id, userId));
      if (rows.length === 0) return null;
      const u = rows[0];
      return {
        id: u.id,
        nickname: u.nickname,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role as UserRole,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
      };
    } else {
      return inMemoryUsers.get(userId) || null;
    }
  }
}
