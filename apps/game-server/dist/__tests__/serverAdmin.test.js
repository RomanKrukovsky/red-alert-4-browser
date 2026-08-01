"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const adminService_js_1 = require("../admin/adminService.js");
(0, vitest_1.describe)('Server Admin Command Authorization & Audit Suite', () => {
    (0, vitest_1.it)('should deny non-admin users from executing admin commands', async () => {
        const res = await adminService_js_1.AdminService.executeCommand({
            command: 'server-stats',
            args: [],
            userId: 'user-player-1',
            role: 'player',
        });
        (0, vitest_1.expect)(res.success).toBe(false);
        (0, vitest_1.expect)(res.message).toContain('requires server admin role');
    });
    (0, vitest_1.it)('should allow admin role to execute safe global admin commands (help, server-stats)', async () => {
        const resHelp = await adminService_js_1.AdminService.executeCommand({
            command: 'help',
            args: [],
            userId: 'user-admin-1',
            role: 'admin',
        });
        (0, vitest_1.expect)(resHelp.success).toBe(true);
        (0, vitest_1.expect)(resHelp.message).toContain('Available admin commands');
        const resStats = await adminService_js_1.AdminService.executeCommand({
            command: 'server-stats',
            args: [],
            userId: 'user-admin-1',
            role: 'admin',
        });
        (0, vitest_1.expect)(resStats.success).toBe(true);
        (0, vitest_1.expect)(resStats.message).toContain('Server Stats');
    });
    (0, vitest_1.it)('should forbid cheat/debug commands in public/ranked matches during production', async () => {
        const prevEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const resCheat = await adminService_js_1.AdminService.executeCommand({
            command: 'give',
            args: ['5000', '0'],
            userId: 'user-admin-1',
            role: 'admin',
            isSandboxOrDevMatch: false,
        });
        (0, vitest_1.expect)(resCheat.success).toBe(false);
        (0, vitest_1.expect)(resCheat.message).toContain('forbidden in public/ranked matches');
        process.env.NODE_ENV = prevEnv;
    });
});
//# sourceMappingURL=serverAdmin.test.js.map