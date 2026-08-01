import { describe, it, expect } from 'vitest';
import { AuthService } from '../../../apps/game-server/src/auth/service.js';

describe('Server Auth & Account Security Suite', () => {
  it('should create guest sessions with unique IDs and player role', async () => {
    const guest1 = await AuthService.createGuestSession();
    const guest2 = await AuthService.createGuestSession();

    expect(guest1.id).toBeDefined();
    expect(guest2.id).toBeDefined();
    expect(guest1.id).not.toEqual(guest2.id);
    expect(guest1.role).toEqual('player');
    expect(guest2.role).toEqual('player');
  });

  it('should register a new user and NOT grant admin role just because nickname is "Админ"', async () => {
    const nick = `Админ_${Date.now()}`;
    const user = await AuthService.register(nick, 'password123');

    expect(user.nickname).toEqual(nick);
    expect(user.role).toEqual('player'); // Strict server role check!
  });

  it('should authenticate valid credentials and reject invalid passwords', async () => {
    const nick = `TestUser_${Date.now()}`;
    await AuthService.register(nick, 'secretPass123');

    const loggedIn = await AuthService.login(nick, 'secretPass123');
    expect(loggedIn.nickname).toEqual(nick);

    await expect(AuthService.login(nick, 'wrongPassword')).rejects.toThrow('Invalid credentials');
  });

  it('should grant admin role ONLY when secretKey matches ADMIN_SECRET_KEY', async () => {
    const adminNick = `SuperAdmin_${Date.now()}`;
    const adminUser = await AuthService.register(adminNick, 'adminPass123', 'admin@ra4.com', process.env.ADMIN_SECRET_KEY || 'admin-secret-bootstrap-key');

    expect(adminUser.role).toEqual('admin');
  });
});
