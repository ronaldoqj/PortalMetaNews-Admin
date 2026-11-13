import { z } from "zod";
import { CONTENT_LOCALES, type ContentLocale } from "../../i18n/locales";

/**
 * The newsroom's contracts: zod schemas mirroring exactly what the API answers (`modules/newsroom`), so an answer
 * outside them is a deployment mismatch and never data to show, plus the inputs the server actions validate again.
 */

const iso = z.iso.datetime();
const uuid = z.uuid();
/** `{ pt?, en? }` as the API stores it; blank entries are dropped by the API. */
export const localizedSchema = z.object({ pt: z.string().optional(), en: z.string().optional() }).strict();
export type Localized = z.infer<typeof localizedSchema>;

export const NEWS_STATUSES = ["draft", "review", "scheduled", "published", "archived"] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];
export const NEWS_ACTIONS = ["submit", "return", "publish", "schedule", "unpublish", "archive", "restore"] as const;
export type NewsAction = (typeof NEWS_ACTIONS)[number];
/** Mirrors the API's `NEWS_LIMITS`. */
export const NEWS_LIMITS = { title: 200, subtitle: 400, caption: 500, seoTitle: 70, seoDescription: 170, tags: 15, slug: 120 } as const;
/** The label colours a section may take (`CATEGORY_COLORS` in the API). */
export const CATEGORY_COLORS = ["blue", "indigo", "violet", "grape", "pink", "red", "orange", "yellow", "lime", "green", "teal", "cyan", "gray"] as const;

export const itemPermissionsSchema = z.object({ edit: z.boolean(), publish: z.boolean(), delete: z.boolean() }).strict();
export type ItemPermissions = z.infer<typeof itemPermissionsSchema>;

export const newsSummarySchema = z.object({
  id: uuid, status: z.enum(NEWS_STATUSES), title: localizedSchema, locales: z.array(z.enum(CONTENT_LOCALES)),
  featured: z.boolean(), breaking: z.boolean(), author: z.object({ id: uuid, name: z.string() }).strict().nullable(),
  category: z.object({ id: uuid, name: localizedSchema, color: z.string() }).strict().nullable(),
  coverMediaId: uuid.nullable(), coverColor: z.string().nullable(), views: z.number().int().nonnegative(),
  publishedAt: iso.nullable(), scheduledAt: iso.nullable(), updatedAt: iso, aiAssisted: z.boolean(), permissions: itemPermissionsSchema,
}).strict();
export type NewsSummary = z.infer<typeof newsSummarySchema>;

export const newsListSchema = z.object({
  items: z.array(newsSummarySchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive(),
  counts: z.object(Object.fromEntries(NEWS_STATUSES.map((status) => [status, z.number().int().nonnegative()])) as Record<NewsStatus, z.ZodNumber>).strict(),
}).strict();
export type NewsList = z.infer<typeof newsListSchema>;

/** A media item as other records embed it (a cover, an image of a body). */
export const mediaBriefSchema = z.object({
  id: uuid, source: z.enum(["upload", "ai"]), width: z.number().int().positive(), height: z.number().int().positive(), color: z.string(),
  alt: localizedSchema, caption: localizedSchema, credit: z.string(),
}).strict();
export type MediaBrief = z.infer<typeof mediaBriefSchema>;

export const mediaItemSchema = mediaBriefSchema.extend({
  title: z.string(), bytes: z.number().nonnegative(), aiPrompt: z.string().nullable(), createdAt: iso, createdBy: z.string().nullable(),
  usage: z.number().int().nonnegative(),
}).strict();
export type MediaItem = z.infer<typeof mediaItemSchema>;
export const mediaListSchema = z.object({
  items: z.array(mediaItemSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive(),
}).strict();
export type MediaList = z.infer<typeof mediaListSchema>;

export const translationStateSchema = z.object({ enabled: z.boolean(), source: z.enum(CONTENT_LOCALES) }).strict();
export type TranslationState = z.infer<typeof translationStateSchema>;

const tagRefSchema = z.object({ id: uuid, name: localizedSchema, slug: localizedSchema }).strict();

/** What the builder edits: every field in both languages, the references resolved and what the account may do. */
export const newsViewSchema = z.object({
  id: uuid, status: z.enum(NEWS_STATUSES), title: localizedSchema, subtitle: localizedSchema, body: localizedSchema, slug: localizedSchema,
  categoryId: uuid.nullable(), category: z.object({ id: uuid, name: localizedSchema, color: z.string(), slug: localizedSchema }).strict().nullable(),
  coverMediaId: uuid.nullable(), cover: mediaBriefSchema.nullable(), coverCaption: localizedSchema,
  authorId: uuid.nullable(), author: z.object({ id: uuid, name: z.string() }).strict().nullable(), tags: z.array(tagRefSchema),
  locales: z.array(z.enum(CONTENT_LOCALES)), featured: z.boolean(), breaking: z.boolean(), seoTitle: localizedSchema, seoDescription: localizedSchema,
  translation: translationStateSchema, aiAssisted: z.boolean(), readingMinutes: z.object({ pt: z.number().optional(), en: z.number().optional() }).strict(),
  views: z.number().int().nonnegative(), publishedAt: iso.nullable(), scheduledAt: iso.nullable(), createdAt: iso, updatedAt: iso,
  createdBy: z.string().nullable(), updatedBy: z.string().nullable(), permissions: itemPermissionsSchema,
}).strict();
export type NewsView = z.infer<typeof newsViewSchema>;

export const revisionSummarySchema = z.object({
  id: uuid, reason: z.enum(["save", "status", "restore", "ai"]), createdAt: iso, createdBy: z.string().nullable(), title: localizedSchema,
}).strict();
export type RevisionSummary = z.infer<typeof revisionSummarySchema>;
export const revisionSchema = z.object({
  id: uuid, createdAt: iso,
  snapshot: z.object({ title: localizedSchema.optional(), subtitle: localizedSchema.optional(), body: localizedSchema.optional() }).loose(),
}).strict();
export type Revision = z.infer<typeof revisionSchema>;

export const categorySchema = z.object({
  id: uuid, name: localizedSchema, slug: z.object({ pt: z.string(), en: z.string() }).strict(), description: localizedSchema, color: z.string(),
  position: z.number().int(), active: z.boolean(), showInMenu: z.boolean(), news: z.number().int().nonnegative().optional(),
}).strict();
export type Category = z.infer<typeof categorySchema>;

export const tagSchema = z.object({ id: uuid, name: localizedSchema, slug: z.object({ pt: z.string(), en: z.string() }).strict(), news: z.number().int().nonnegative().optional() }).strict();
export type Tag = z.infer<typeof tagSchema>;
export const tagListSchema = z.object({ items: z.array(tagSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }).strict();

export const frontPageSchema = z.object({ headline: uuid.nullable(), highlights: z.array(uuid).max(4), sections: z.array(uuid).max(8) }).strict();
export type FrontPage = z.infer<typeof frontPageSchema>;

export const authorSchema = z.object({ id: uuid, name: z.string(), avatarVersion: iso.nullable() }).strict();
export type Author = z.infer<typeof authorSchema>;

/** Whether the AI answers now (`panel/settings/ai/status`): the builder offers translation only when it does. */
export const aiStatusSchema = z.object({
  available: z.boolean(), provider: z.enum(["gemini", "local"]).nullable(), generative: z.boolean(), textModel: z.string().nullable(),
  imageModel: z.string().nullable(), images: z.boolean(), code: z.string().optional(),
}).strict();
export type AiStatus = z.infer<typeof aiStatusSchema>;

export const translationResultSchema = z.object({ fields: z.record(z.string(), z.string()), provider: z.enum(["gemini", "local"]), simulated: z.boolean() }).strict();
export type TranslationResult = z.infer<typeof translationResultSchema>;

const localizedCount = z.object({ pt: z.string().optional(), en: z.string().optional() }).strict();
export const dashboardSchema = z.object({
  statuses: z.object(Object.fromEntries(NEWS_STATUSES.map((status) => [status, z.number().int().nonnegative()])) as Record<NewsStatus, z.ZodNumber>).strict(),
  week: z.object({ published: z.number(), publishedPrevious: z.number(), views: z.number(), viewsPrevious: z.number() }).strict(),
  aiAssisted: z.number().int().nonnegative(),
  trend: z.array(z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), views: z.number(), published: z.number() }).strict()),
  top: z.array(z.object({ id: uuid, title: localizedCount, views: z.number(), total: z.number(), category: localizedSchema.nullable(), color: z.string().nullable() }).strict()),
  categories: z.array(z.object({ id: uuid, name: localizedSchema, color: z.string(), count: z.number().int().nonnegative() }).strict()),
  mine: z.array(z.object({ id: uuid, title: localizedCount, status: z.enum(NEWS_STATUSES), updatedAt: iso }).strict()),
  review: z.array(z.object({ id: uuid, title: localizedCount, author: z.string().nullable(), updatedAt: iso }).strict()),
  scheduled: z.array(z.object({ id: uuid, title: localizedCount, scheduledAt: iso }).strict()),
  unreadMessages: z.number().int().nonnegative(),
}).strict();
export type Dashboard = z.infer<typeof dashboardSchema>;

// ------------------------------------------------------------------------------------------------- Inputs

const localizedInput = (max: number) => z.object({ pt: z.string().max(max).optional(), en: z.string().max(max).optional() }).strict();

/** What the builder saves: only the fields that changed, with the version it loaded. */
export const newsPatchSchema = z.object({
  title: localizedInput(NEWS_LIMITS.title).optional(),
  subtitle: localizedInput(NEWS_LIMITS.subtitle).optional(),
  body: localizedInput(400_000).optional(),
  slug: z.object({ pt: z.string().max(NEWS_LIMITS.slug).optional(), en: z.string().max(NEWS_LIMITS.slug).optional() }).strict().optional(),
  categoryId: uuid.nullable().optional(),
  coverMediaId: uuid.nullable().optional(),
  coverCaption: localizedInput(NEWS_LIMITS.caption).optional(),
  authorId: uuid.nullable().optional(),
  tagIds: z.array(uuid).max(NEWS_LIMITS.tags).optional(),
  locales: z.array(z.enum(CONTENT_LOCALES)).max(2).optional(),
  featured: z.boolean().optional(),
  breaking: z.boolean().optional(),
  seoTitle: localizedInput(NEWS_LIMITS.seoTitle).optional(),
  seoDescription: localizedInput(NEWS_LIMITS.seoDescription).optional(),
  translation: translationStateSchema.optional(),
  expectedUpdatedAt: iso.optional(),
}).strict();
export type NewsPatch = z.infer<typeof newsPatchSchema>;

export const statusInputSchema = z.object({ action: z.enum(NEWS_ACTIONS), scheduledAt: iso.optional() }).strict();

export const translateInputSchema = z.object({
  from: z.enum(CONTENT_LOCALES), to: z.enum(CONTENT_LOCALES),
  fields: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/), z.object({ text: z.string().max(400_000), format: z.enum(["plain", "html"]) }).strict()),
}).strict().refine((value) => value.from !== value.to && Object.keys(value.fields).length <= 24);

export const categoryInputSchema = z.object({
  name: localizedInput(80).refine((value) => CONTENT_LOCALES.some((locale) => !!value[locale]?.trim())),
  description: localizedInput(300).optional(),
  color: z.enum(CATEGORY_COLORS),
  active: z.boolean(),
  showInMenu: z.boolean(),
  slugPt: z.string().regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  slugEn: z.string().regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
}).strict();
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const tagInputSchema = z.object({
  name: localizedInput(60).refine((value) => CONTENT_LOCALES.some((locale) => !!value[locale]?.trim())),
  slugPt: z.string().regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  slugEn: z.string().regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
}).strict();
export type TagInput = z.infer<typeof tagInputSchema>;

export const mediaMetadataInputSchema = z.object({
  title: z.string().trim().max(200), alt: localizedInput(300), caption: localizedInput(500), credit: z.string().trim().max(160),
}).strict();
export type MediaMetadataInput = z.infer<typeof mediaMetadataInputSchema>;

export const mediaGenerateInputSchema = z.object({ prompt: z.string().trim().min(3).max(1000), title: z.string().trim().max(200).optional() }).strict();

/** The other language, for translation. */
export function otherOf(locale: ContentLocale): ContentLocale {
  return locale === "pt" ? "en" : "pt";
}
