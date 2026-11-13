import { UnauthorizedException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { AccessService, hashAdminPassword } from './access.service.js';

describe('AccessService boundaries', () => {
  const service = new AccessService({} as DataSource);

  it.each(['', 'short', 'a'.repeat(10000)])('rejects malformed session tokens before database access', async (token) => {
    await expect(service.authenticate(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['', 'short', 'A'.repeat(44), `${'A'.repeat(42)}=`])('rejects malformed password-change tokens before database access', async (token) => {
    await expect(service.forcePasswordChange(token, 'Definitive-Pass-2026')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('never turns a pending password change into a full session', async () => {
    const pending = new AccessService({} as DataSource);
    vi.spyOn(pending, 'signIn').mockResolvedValue({ requiresPasswordChange: true, temporaryToken: 'A'.repeat(43) });
    await expect(pending.login('admin@example.org', 'temporary-password')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['short', 'a'.repeat(129)])('rejects weak or oversized passwords', async (password) => {
    await expect(hashAdminPassword(password)).rejects.toThrow('Invalid password length');
  });
});
