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
export declare class AuthService {
    /**
     * Register a new user account with nickname, email, password.
     * Enforces server role verification. Setting nickname to "Админ" does NOT grant admin role.
     */
    static register(nickname: string, password: string, email?: string, secretKey?: string): Promise<UserRecord>;
    /**
     * Create a temporary Guest session
     */
    static createGuestSession(): Promise<UserRecord>;
    /**
     * Login user with nickname/email and password
     */
    static login(identifier: string, password: string, ipAddress?: string): Promise<UserRecord>;
    /**
     * Get user profile by userId
     */
    static getProfile(userId: string): Promise<{
        user: {
            nickname: string;
            role: string;
            id: string;
            email: string | null;
            passwordHash: string;
            isBanned: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        profile: {
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            matchesPlayed: number;
            wins: number;
            losses: number;
            eloRating: number;
            totalPlaytimeSeconds: number;
            favoriteFaction: string;
        };
    } | {
        user: UserRecord;
        profile: any;
    } | null>;
    /**
     * Helper to fetch UserRecord by ID
     */
    static getUserById(userId: string): Promise<UserRecord | null>;
}
//# sourceMappingURL=service.d.ts.map