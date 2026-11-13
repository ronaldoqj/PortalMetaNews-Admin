import { ForbiddenException } from '@nestjs/common';

/**
 * What an account of the panel may do. Roles grant sets of these; every endpoint and service checks them again, so
 * hiding an action in the interface is never the only control. Mirrored by the frontend (`permissions.ts`) and
 * copied literally by the baseline migration.
 */
export const PERMISSIONS = [
  // News: read every item in the panel, write (create and edit one's own), edit anyone's, publish and delete.
  'news:read', 'news:write', 'news:edit_all', 'news:publish', 'news:delete',
  'taxonomy:manage', 'media:manage', 'ai:use', 'front_page:manage',
  // The portal's look (themes and brand images) and its own content (name, social links, legal texts).
  'themes:manage', 'site:manage',
  // Integrations: AI provider, e-mail and storage.
  'settings:manage',
  'users:manage', 'contacts:read', 'audit:read', 'documentation:read',
] as const;
export type Permission = typeof PERMISSIONS[number];

/** The system roles seeded by the baseline. A system role can gain permissions but never lose these. */
export const SYSTEM_ROLES = {
  admin: PERMISSIONS,
  editor: ['news:read', 'news:write', 'news:edit_all', 'news:publish', 'news:delete', 'taxonomy:manage', 'media:manage', 'ai:use',
    'front_page:manage', 'contacts:read', 'documentation:read'],
  reporter: ['news:read', 'news:write', 'media:manage', 'ai:use'],
  reviewer: ['news:read', 'news:edit_all', 'ai:use'],
} as const satisfies Record<string, readonly Permission[]>;
export type SystemRole = keyof typeof SYSTEM_ROLES;

/** Who can always restore access: at least one enabled account must keep it. */
export const ACCESS_PERMISSION: Permission = 'users:manage';

export function isPermission(value: unknown): value is Permission {
  return (PERMISSIONS as readonly unknown[]).includes(value);
}

/** Writing, editing anyone's or publishing is meaningless without reading, so `news:read` always comes along. */
export function normalizePermissions(permissions: readonly Permission[]): Permission[] {
  const set = new Set(permissions);
  if (['news:write', 'news:edit_all', 'news:publish', 'news:delete'].some((permission) => set.has(permission as Permission))) set.add('news:read');
  return PERMISSIONS.filter((permission) => set.has(permission));
}

/** The signed-in account a request acts as, read from its session on every request. */
export interface Actor {
  userId: string;
  email: string;
  name: string;
  /** When the profile photo last changed (cache key of the header avatar), or null without a photo. */
  avatarVersion: string | null;
  roleId: string;
  roleName: string;
  /** The slug of a system role, so the interface names it in its own language; null for a custom role. */
  roleSlug: string | null;
  permissions: Permission[];
}

export function hasPermission(actor: Actor, permission: Permission): boolean {
  return actor.permissions.includes(permission);
}

/** Requires an account holding any of the given permissions (every account when none are given). */
export function requirePermission(actor: Actor | undefined, ...anyOf: Permission[]): Actor {
  if (!actor || !Array.isArray(actor.permissions)) throw new ForbiddenException();
  if (anyOf.length > 0 && !anyOf.some((permission) => actor.permissions.includes(permission))) throw new ForbiddenException();
  return actor;
}
