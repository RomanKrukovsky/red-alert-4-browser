import { describe, it, expect } from 'vitest';
import { AdminService } from '../admin/adminService';

describe('Server Admin Command Authorization & Audit Suite', () => {
  it('should deny non-admin users from executing admin commands', async () => {
    const res = await AdminService.executeCommand({
      command: 'server-stats',
      args: [],
      userId: 'user-player-1',
      role: 'player',
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('requires server admin role');
  });

  it('should allow admin role to execute safe global admin commands (help, server-stats)', async () => {
    const resHelp = await AdminService.executeCommand({
      command: 'help',
      args: [],
      userId: 'user-admin-1',
      role: 'admin',
    });

    expect(resHelp.success).toBe(true);
    expect(resHelp.message).toContain('Available admin commands');

    const resStats = await AdminService.executeCommand({
      command: 'server-stats',
      args: [],
      userId: 'user-admin-1',
      role: 'admin',
    });

    expect(resStats.success).toBe(true);
    expect(resStats.message).toContain('Server Stats');
  });

  it('should forbid cheat/debug commands in public/ranked matches during production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const resCheat = await AdminService.executeCommand({
      command: 'give',
      args: ['5000', '0'],
      userId: 'user-admin-1',
      role: 'admin',
      isSandboxOrDevMatch: false,
    });

    expect(resCheat.success).toBe(false);
    expect(resCheat.message).toContain('forbidden in public/ranked matches');

    process.env.NODE_ENV = prevEnv;
  });
});
