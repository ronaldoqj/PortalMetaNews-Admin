import { z } from "zod";

/**
 * The public API's answers, exactly as `modules/newsroom/public-news.service.ts` and `modules/public/public.controller.ts`
 * write them (strict objects: an answer outside its contract is a deployment mismatch, never data to show). Every text
 * is already in the page's language: an item not published in it is never listed.
 */
const iso = z.iso.datetime({ offset: true });
const slugs = z.object({ pt: z.string().optional(), en: z.string().optional() }).strict();

export const cardCategorySchema = z.object({ id: z.uuid(), name: z.string(), slug: z.string(), color: z.string() }).strict();
export const cardCoverSchema = z.object({
  id: z.uuid(), width: z.number().int().positive(), height: z.number().int().positive(), color: z.string(), alt: z.string(), source: z.enum(["upload", "ai"]),
}).strict();

export const newsCardSchema = z.object({
  id: z.uuid(), title: z.string(), subtitle: z.string(), slug: z.string(), slugs,
  publishedAt: iso, updatedAt: iso, readingMinutes: z.number().int().positive(), breaking: z.boolean(), featured: z.boolean(),
  author: z.object({ id: z.uuid(), name: z.string() }).strict().nullable(),
  category: cardCategorySchema.nullable(),
  cover: cardCoverSchema.nullable(),
}).strict();
export type NewsCard = z.infer<typeof newsCardSchema>;

export const homeSchema = z.object({
  headline: newsCardSchema.nullable(),
  highlights: z.array(newsCardSchema),
  breaking: z.array(newsCardSchema),
  latest: z.array(newsCardSchema),
  sections: z.array(z.object({ category: cardCategorySchema, items: z.array(newsCardSchema) }).strict()),
  mostRead: z.array(newsCardSchema),
}).strict();
export type Home = z.infer<typeof homeSchema>;

export const newsPageSchema = z.object({
  items: z.array(newsCardSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive(),
}).strict();
export type NewsPage = z.infer<typeof newsPageSchema>;

export const articleMediaSchema = z.object({
  id: z.uuid(), source: z.enum(["upload", "ai"]), width: z.number().int().positive(), height: z.number().int().positive(), color: z.string(),
  alt: z.string(), caption: z.string(), credit: z.string(),
}).strict();

export const articleSchema = newsCardSchema.extend({
  body: z.string(),
  aiAssisted: z.boolean(),
  cover: cardCoverSchema.extend({ caption: z.string(), credit: z.string() }).strict().nullable(),
  seo: z.object({ title: z.string(), description: z.string() }).strict(),
  author: z.object({ id: z.uuid(), name: z.string(), jobTitle: z.string(), bio: z.string(), avatar: iso.nullable() }).strict().nullable(),
  tags: z.array(z.object({ name: z.string(), slug: z.string() }).strict()),
  media: z.array(articleMediaSchema),
  related: z.array(newsCardSchema),
  /** The item's address in each language it is published in, for the language switch and `hreflang`. */
  alternates: slugs,
}).strict();
export type Article = z.infer<typeof articleSchema>;

export const categoryPageSchema = z.object({
  id: z.uuid(), name: z.string(), description: z.string(), slug: z.string(), slugs: z.object({ pt: z.string(), en: z.string() }).strict(), color: z.string(),
}).strict();
export type CategoryPage = z.infer<typeof categoryPageSchema>;

export const tagPageSchema = z.object({ id: z.uuid(), name: z.string(), slug: z.string(), slugs: z.object({ pt: z.string(), en: z.string() }).strict() }).strict();
export type TagPage = z.infer<typeof tagPageSchema>;

export const authorPageSchema = z.object({ id: z.uuid(), name: z.string(), bio: z.string(), jobTitle: z.string(), avatar: iso.nullable() }).strict();
export type AuthorPage = z.infer<typeof authorPageSchema>;

export const feedSchema = z.array(newsCardSchema);

export const sitemapSchema = z.object({
  news: z.array(z.object({ slugs, updatedAt: iso, publishedAt: iso }).strict()),
  categories: z.array(z.object({ slugs: z.object({ pt: z.string(), en: z.string() }).strict() }).strict()),
}).strict();
export type SitemapData = z.infer<typeof sitemapSchema>;

/** The legal texts come through `components/site-legal/contracts.ts` (`publishedLegalSchema`), shared with the panel's editor. */
export { publishedLegalSchema, LEGAL_KINDS, type LegalKind, type PublishedLegal } from "../site-legal/contracts";

/** What a reader writes about, mirroring the API's `CONTACT_TOPICS`. */
export const CONTACT_TOPICS = ["tip", "correction", "advertising", "press", "privacy", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
