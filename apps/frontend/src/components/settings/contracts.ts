import { z } from "zod";

const model = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/);

/** Mirrors the API (`common/ai/ai.service.ts`). */
export const AI_PROVIDERS = ["auto", "gemini", "local", "disabled"] as const;
export const AI_CODES = ["ai_disabled", "ai_unconfigured", "ai_provider_failed", "ai_key_rejected", "ai_images_unavailable"] as const;

export const effectiveAiSchema = z.object({
  available: z.boolean(), provider: z.enum(["gemini", "local"]).nullable(), generative: z.boolean(),
  textModel: z.string().nullable(), imageModel: z.string().nullable(), images: z.boolean(), code: z.enum(AI_CODES).optional(),
}).strict();
export type EffectiveAi = z.infer<typeof effectiveAiSchema>;

/** The AI settings as the panel sees them: never the key, only whether one is stored or set on the server. */
export const aiSettingsSchema = z.object({
  provider: z.enum(AI_PROVIDERS), apiKeySet: z.boolean(), environmentKeySet: z.boolean(),
  textModel: z.string().nullable(), imageModel: z.string().nullable(), guidelines: z.string(), images: z.boolean(),
  defaults: z.object({ textModel: z.string(), imageModel: z.string() }).strict(),
  effective: effectiveAiSchema,
}).strict();
export type AiSettings = z.infer<typeof aiSettingsSchema>;

export const saveAiSettingsSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  /** Write-only: omitted keeps the stored key, an empty string removes it. */
  apiKey: z.string().trim().max(256).refine((value) => value === "" || (value.length >= 20 && !/\s/.test(value))).optional(),
  textModel: model.nullable(), imageModel: model.nullable(), guidelines: z.string().max(4000), images: z.boolean(),
}).strict();

export const aiTestSchema = z.object({ ok: z.boolean(), provider: z.string().nullable(), code: z.enum(AI_CODES).optional() }).strict();
export type AiTest = z.infer<typeof aiTestSchema>;

/** Mirrors the API (`common/mail/email-settings.service.ts`): the password is write-only, only its presence is shown. */
export const emailSettingsSchema = z.object({
  enabled: z.boolean(), host: z.string().nullable(), port: z.number().int().nullable(), secure: z.boolean(), user: z.string().nullable(),
  passwordSet: z.boolean(), fromEmail: z.string().nullable(), fromName: z.string().nullable(),
  /** Whether the server's environment carries its own relay (`SMTP_*`), used while the panel stores none. */
  environmentRelay: z.boolean(), effective: z.enum(["panel", "environment"]).nullable(),
}).strict();
export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const saveEmailSettingsSchema = z.object({
  enabled: z.boolean(), host: z.string().trim().max(253).nullable(), port: z.number().int().min(1).max(65535).nullable(), secure: z.boolean(),
  user: z.string().trim().max(254).nullable(), password: z.string().max(512).optional(),
  fromEmail: z.union([z.literal(""), z.email().max(254)]).nullable(), fromName: z.string().trim().max(100).nullable(),
}).strict();

export const emailTestSchema = z.object({ ok: z.boolean(), code: z.string().max(80).optional() }).strict();
export type EmailTest = z.infer<typeof emailTestSchema>;

/** Where files are kept and what the media library holds; read-only. */
export const storageInfoSchema = z.object({
  driver: z.enum(["local", "s3"]), configured: z.boolean(), reachable: z.boolean(), uploadMaxMb: z.number().int().positive(),
  bucket: z.string().nullable(), media: z.object({ items: z.number().int().nonnegative(), bytes: z.number().nonnegative(), generated: z.number().int().nonnegative() }).strict(),
}).strict();
export type StorageInfo = z.infer<typeof storageInfoSchema>;
