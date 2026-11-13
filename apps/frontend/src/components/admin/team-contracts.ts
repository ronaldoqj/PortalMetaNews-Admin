import { z } from "zod";
import { i18nStringSchema } from "../../i18n/i18n-string";
import { PERMISSIONS, permissionSchema, SYSTEM_ROLE_SLUGS, type Permission } from "./permissions";

/** A role of the panel, as `panel/team/roles` answers it. System roles keep their name and can only gain permissions. */
export const roleSchema = z.object({
  id: z.uuid(), name: z.string(), slug: z.string(), description: z.string(), isSystem: z.boolean(),
  permissions: z.array(permissionSchema), members: z.number().int().nonnegative(),
}).strict();
export type Role = z.infer<typeof roleSchema>;

/** An account of the panel, as `panel/team/users` and `panel/profile` answer it. */
export const teamUserSchema = z.object({
  id: z.uuid(), name: z.string(), email: z.email(), avatarVersion: z.iso.datetime().nullable(), roleId: z.uuid(), enabled: z.boolean(),
  requiresPasswordChange: z.boolean(),
  /** The author profile the site shows beside a byline and on the author's page. */
  jobTitle: i18nStringSchema({ maxLength: 120, required: false }), bio: i18nStringSchema({ maxLength: 1000, required: false }),
  createdAt: z.iso.datetime(), lastLoginAt: z.iso.datetime().nullable(),
  /** News items signed by the account. */
  news: z.number().int().nonnegative(),
}).strict();
export type TeamUser = z.infer<typeof teamUserSchema>;

export const createdUserSchema = teamUserSchema.extend({ temporaryPassword: z.string().min(12).max(128) }).strict();
export const temporaryPasswordSchema = z.object({ email: z.email(), temporaryPassword: z.string().min(12).max(128) }).strict();

const name = z.string().trim().min(1);
const jobTitle = i18nStringSchema({ maxLength: 120, required: false });
const bio = i18nStringSchema({ maxLength: 1000, required: false });

export const saveRoleSchema = z.object({
  name: name.max(120), description: z.string().trim().max(500), permissions: z.array(permissionSchema).max(PERMISSIONS.length),
}).strict();
export const createUserSchema = z.object({ name: name.max(160), email: z.string().trim().toLowerCase().pipe(z.email().max(254)), roleId: z.uuid() }).strict();
export const updateUserSchema = z.object({
  name: name.max(160).optional(), roleId: z.uuid().optional(), enabled: z.boolean().optional(), jobTitle: jobTitle.optional(), bio: bio.optional(),
}).strict();
export const profileSchema = z.object({ name: name.max(160).optional(), jobTitle: jobTitle.optional(), bio: bio.optional() }).strict();

/**
 * The permissions grouped by what they are about, in the order the role editor lists them. Every permission belongs
 * to exactly one group (`team-contracts.test.ts`).
 */
export const PERMISSION_GROUPS = [
  { key: "news", permissions: ["news:read", "news:write", "news:edit_all", "news:publish", "news:delete"] },
  { key: "content", permissions: ["taxonomy:manage", "media:manage", "ai:use", "front_page:manage"] },
  { key: "site", permissions: ["themes:manage", "site:manage", "contacts:read"] },
  { key: "administration", permissions: ["users:manage", "settings:manage", "audit:read", "documentation:read"] },
] as const satisfies ReadonlyArray<{ key: string; permissions: readonly Permission[] }>;

/** The message key of a permission: `news:edit_all` is `news_edit_all`. */
export const permissionKey = (permission: Permission) => permission.replace(/[:]/g, "_");

export const isSystemRole = (slug: string): slug is (typeof SYSTEM_ROLE_SLUGS)[number] => (SYSTEM_ROLE_SLUGS as readonly string[]).includes(slug);
