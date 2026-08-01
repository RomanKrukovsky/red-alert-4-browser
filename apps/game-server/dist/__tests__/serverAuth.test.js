"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const service_1 = require("../auth/service");
const env_1 = require("../config/env");
(0, vitest_1.describe)('Server Auth & Account Security Suite', () => {
    (0, vitest_1.it)('should create guest sessions with unique IDs and player role', async () => {
        const guest1 = await service_1.AuthService.createGuestSession();
        const guest2 = await service_1.AuthService.createGuestSession();
        (0, vitest_1.expect)(guest1.id).toBeDefined();
        (0, vitest_1.expect)(guest2.id).toBeDefined();
        (0, vitest_1.expect)(guest1.id).not.toEqual(guest2.id);
        (0, vitest_1.expect)(guest1.role).toEqual('player');
        (0, vitest_1.expect)(guest2.role).toEqual('player');
    });
    (0, vitest_1.it)('should register a new user and NOT grant admin role just because nickname is "Админ"', async () => {
        const nick = `Админ_${Date.now()}`;
        const user = await service_1.AuthService.register(nick, 'password123');
        (0, vitest_1.expect)(user.nickname).toEqual(nick);
        (0, vitest_1.expect)(user.role).toEqual('player');
    });
    (0, vitest_1.it)('should authenticate valid credentials and reject invalid passwords', async () => {
        const nick = `TestUser_${Date.now()}`;
        await service_1.AuthService.register(nick, 'secretPass123');
        const loggedIn = await service_1.AuthService.login(nick, 'secretPass123');
        (0, vitest_1.expect)(loggedIn.nickname).toEqual(nick);
        await (0, vitest_1.expect)(service_1.AuthService.login(nick, 'wrongPassword')).rejects.toThrow('Invalid credentials');
    });
    (0, vitest_1.it)('should grant admin role ONLY when secretKey matches ADMIN_SECRET_KEY', async () => {
        const adminNick = `SuperAdmin_${Date.now()}`;
        const adminUser = await service_1.AuthService.register(adminNick, 'adminPass123', 'admin@ra4.com', env_1.env.ADMIN_SECRET_KEY);
        (0, vitest_1.expect)(adminUser.role).toEqual('admin');
    });
});
//# sourceMappingURL=serverAuth.test.js.map