import { z } from "zod";
import { permissionSchema } from "./permissions";

/** The signed-in account of the panel, as `auth/session` answers it (`Actor` in the API). */
export const actorSchema = z.object({
  userId: z.uuid(), email: z.email(),
  /** Display name for the header; may be blank, in which case the e-mail stands in. */
  name: z.string().max(160),
  /** When the profile photo last changed (the header avatar's cache key), or null without a photo. */
  avatarVersion: z.iso.datetime().nullable(),
  roleId: z.uuid(), roleName: z.string().max(120),
  /** A system role's slug, so the interface names it in its own language; null for a custom role. */
  roleSlug: z.string().max(64).nullable(),
  /** An unknown permission rejects the whole session, so it fails closed. */
  permissions: z.array(permissionSchema),
}).strict();
export type Actor = z.infer<typeof actorSchema>;

export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(12).max(128) });
export const tokenSchema = z.string().regex(/^[a-zA-Z0-9_-]{43}$/);
export const loginResponseSchema = z.object({ token: tokenSchema, actor: actorSchema }).strict();
/** A temporary password yields no session: only a short-lived token for the mandatory first-access change. */
export const passwordChangeChallengeSchema = z.object({ requiresPasswordChange: z.literal(true), temporaryToken: tokenSchema }).strict();
export const loginResultSchema = z.union([loginResponseSchema, passwordChangeChallengeSchema]);

/**
 * Mirrors the API policy for a definitive password: 12-128 characters, at least three of lowercase, uppercase, digits
 * and symbols, and no character repeated six times in a row.
 */
export const strongPasswordSchema = z.string().min(12).max(128)
  .refine((value) => value.trim().length > 0 && !/(.)\1{5,}/u.test(value))
  .refine((value) => [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((pattern) => pattern.test(value)).length >= 3);
export const firstAccessSchema = z.object({ password: z.string().min(1).max(128), confirmation: z.string().min(1).max(128) })
  .strict().refine((value) => value.password === value.confirmation);

/** A temporary password shown once to whoever generated it, and what happened to the e-mail (always manual here). */
export type TemporaryCredentials = { email: string; temporaryPassword: string; delivery: "manual" };

export const setupStatusSchema = z.object({ setupRequired: z.boolean(), setupTokenRequired: z.boolean(), setupAvailable: z.boolean() }).strict();
export type SetupStatus = z.infer<typeof setupStatusSchema>;

export const initialSetupSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(128),
  confirmation: z.string().min(12).max(128),
  setupToken: z.string().max(256).optional(),
}).strict().refine((value) => value.password === value.confirmation);
