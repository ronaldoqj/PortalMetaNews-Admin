import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERMISSIONS, SYSTEM_ROLES, normalizePermissions, requirePermission, type Actor } from './permissions.js';

const actor = (permissions: Actor['permissions']): Actor => ({
  userId: 'u', email: 'a@b.c', name: 'A', avatarVersion: null, roleId: 'r', roleName: 'R', roleSlug: null, permissions,
});

describe('permissions', () => {
  it('denies by default and admits any of the listed permissions', () => {
    expect(() => requirePermission(undefined)).toThrow();
    expect(() => requirePermission(actor(['news:read']), 'news:publish')).toThrow();
    expect(requirePermission(actor(['news:read', 'news:publish']), 'news:publish', 'news:delete').userId).toBe('u');
  });

  it('adds reading to any writing permission', () => {
    expect(normalizePermissions(['news:publish'])).toEqual(['news:read', 'news:publish']);
  });

  it('keeps the migration, the system roles and the frontend in step', () => {
    const migration = readFileSync(fileURLToPath(new URL('../database/migrations/1900000000000-baseline.ts', import.meta.url)), 'utf8');
    for (const permission of PERMISSIONS) expect(migration).toContain(`'${permission}'`);
    for (const role of Object.keys(SYSTEM_ROLES)) expect(migration).toContain(`slug: '${role}'`);
    const frontend = readFileSync(fileURLToPath(new URL('../../../../frontend/src/components/admin/permissions.ts', import.meta.url)), 'utf8');
    expect(frontend).toContain(`export const PERMISSIONS = [${PERMISSIONS.map((permission) => `"${permission}"`).join(', ')}] as const;`);
  });
});
