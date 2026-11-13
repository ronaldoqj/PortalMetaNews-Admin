import { z } from "zod";

/** Mirrors the API's permissions (`common/access/permissions.ts`). The interface hides what a role cannot do; the API enforces it. */
export const PERMISSIONS = ["news:read", "news:write", "news:edit_all", "news:publish", "news:delete", "taxonomy:manage", "media:manage", "ai:use", "front_page:manage", "themes:manage", "site:manage", "settings:manage", "users:manage", "contacts:read", "audit:read", "documentation:read"] as const;
export const permissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof permissionSchema>;

/** The system roles' slugs, so the interface names them in its own language. */
export const SYSTEM_ROLE_SLUGS = ["admin", "editor", "reporter", "reviewer"] as const;

export function hasPermission(actor: { permissions?: readonly string[] } | null | undefined, permission: Permission): boolean {
  return !!actor?.permissions?.includes(permission);
}

export function hasAnyPermission(actor: { permissions?: readonly string[] } | null | undefined, permissions: readonly Permission[]): boolean {
  return permissions.length === 0 || permissions.some((permission) => hasPermission(actor, permission));
}
