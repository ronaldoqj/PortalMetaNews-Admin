"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPathname } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";
import { panelApi, withQuery } from "../admin/api-call";
import { INVALID_INPUT, type ApiResult } from "../admin/api-result";
import { actOnResource, removeResource, reorderResource, saveResource } from "../admin/resource";
import { SLOW_API_TIMEOUT_MS } from "../admin/server";
import {
  categoryInputSchema, categorySchema, frontPageSchema, mediaGenerateInputSchema, mediaItemSchema, mediaListSchema, mediaMetadataInputSchema,
  newsListSchema, newsPatchSchema, newsViewSchema, revisionSchema, revisionSummarySchema, statusInputSchema, tagInputSchema, tagListSchema, tagSchema,
  translateInputSchema, translationResultSchema, type Category, type FrontPage, type MediaItem, type MediaList, type NewsList, type NewsView,
  type Revision, type RevisionSummary, type Tag, type TranslationResult,
} from "./contracts";

/**
 * The newsroom's server actions. Every path is fixed here and every input is validated again before it reaches the
 * API, which checks the permission and the item's own rules once more.
 */

const id = z.uuid();
const validId = (value: unknown): value is string => id.safeParse(value).success;

/** A new draft, opened in the builder: the form action of the "Nova notícia" buttons. */
export async function createNewsAndOpen(locale: string): Promise<void> {
  const created = await panelApi("panel/news", { method: "POST", body: {}, permission: "news:write", schema: newsViewSchema, revalidate: true });
  const target = routing.locales.find((candidate) => candidate === locale) ?? routing.defaultLocale;
  if (!created.ok) redirect(`${getPathname({ locale: target, href: "/panel/news" })}?error=${created.error}`);
  redirect(getPathname({ locale: target, href: { pathname: "/panel/news/[id]", params: { id: created.data.id } } }));
}

export async function createDraft(): Promise<ApiResult<NewsView>> {
  return panelApi("panel/news", { method: "POST", body: {}, permission: "news:write", schema: newsViewSchema, revalidate: true });
}

export async function saveNews(newsId: string, patch: unknown): Promise<ApiResult<NewsView>> {
  const parsed = newsPatchSchema.safeParse(patch);
  if (!validId(newsId) || !parsed.success) return INVALID_INPUT;
  return panelApi(`panel/news/${newsId}`, { method: "PATCH", body: parsed.data, permission: ["news:write", "news:edit_all"], schema: newsViewSchema, revalidate: true });
}

export async function changeNewsStatus(newsId: string, input: unknown): Promise<ApiResult<NewsView>> {
  const parsed = statusInputSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return actOnResource("panel/news", newsId, "status", { body: parsed.data, schema: newsViewSchema, permission: "news:read" });
}

export async function deleteNews(newsId: string): Promise<ApiResult> {
  return removeResource("panel/news", newsId, "news:delete");
}

/** Machine translation of the builder's fields; nothing is stored. Slow: it waits for the model. */
export async function translateFields(input: unknown): Promise<ApiResult<TranslationResult>> {
  const parsed = translateInputSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi("panel/translate", { method: "POST", body: parsed.data, permission: "ai:use", schema: translationResultSchema, timeoutMs: SLOW_API_TIMEOUT_MS });
}

export async function listRevisions(newsId: string): Promise<ApiResult<RevisionSummary[]>> {
  if (!validId(newsId)) return INVALID_INPUT;
  return panelApi(`panel/news/${newsId}/revisions`, { permission: "news:read", schema: z.array(revisionSummarySchema) });
}

export async function getRevision(newsId: string, revisionId: string): Promise<ApiResult<Revision>> {
  if (!validId(newsId) || !validId(revisionId)) return INVALID_INPUT;
  return panelApi(`panel/news/${newsId}/revisions/${revisionId}`, { permission: "news:read", schema: revisionSchema });
}

export async function restoreRevision(newsId: string, revisionId: string): Promise<ApiResult<NewsView>> {
  if (!validId(newsId) || !validId(revisionId)) return INVALID_INPUT;
  return panelApi(`panel/news/${newsId}/revisions/${revisionId}/restore`, { method: "POST", permission: ["news:write", "news:edit_all"], schema: newsViewSchema, revalidate: true });
}

/** Published news matching a search, for the front page's pickers. */
export async function searchPublishedNews(search: string): Promise<ApiResult<NewsList>> {
  const text = z.string().trim().max(120).safeParse(search);
  if (!text.success) return INVALID_INPUT;
  return panelApi(withQuery("panel/news", { status: "published", search: text.data, sort: "published" }), { permission: "news:read", schema: newsListSchema });
}

// --------------------------------------------------------------------------------------------- Tags

export async function searchTags(search: string): Promise<ApiResult<Tag[]>> {
  const text = z.string().trim().max(80).safeParse(search);
  if (!text.success) return INVALID_INPUT;
  const result = await panelApi(withQuery("panel/tags", { search: text.data }), { schema: tagListSchema });
  return result.ok ? { ok: true, data: result.data.items } : result;
}

/** A tag named in both languages from what was typed (the API generates the slugs). */
export async function createTag(name: unknown): Promise<ApiResult<Tag>> {
  const parsed = z.object({ pt: z.string().trim().min(1).max(60), en: z.string().trim().max(60) }).strict().safeParse(name);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi("panel/tags", { method: "POST", body: { name: { pt: parsed.data.pt, en: parsed.data.en || parsed.data.pt } }, permission: ["taxonomy:manage", "news:write"], schema: tagSchema, revalidate: true });
}

export async function saveTag(tagId: string | null, values: unknown): Promise<ApiResult<Tag>> {
  const parsed = tagInputSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;
  const slug = Object.fromEntries(Object.entries({ pt: parsed.data.slugPt, en: parsed.data.slugEn }).filter(([, value]) => value));
  return saveResource("panel/tags", tagId, { name: parsed.data.name, ...(Object.keys(slug).length ? { slug } : {}) },
    z.object({ name: z.object({ pt: z.string().optional(), en: z.string().optional() }), slug: z.object({ pt: z.string().optional(), en: z.string().optional() }).optional() }),
    { permission: "taxonomy:manage", schema: tagSchema });
}

export async function removeTag(tagId: string): Promise<ApiResult> {
  return removeResource("panel/tags", tagId, "taxonomy:manage");
}

// --------------------------------------------------------------------------------------------- Sections

export async function saveCategory(categoryId: string | null, values: unknown): Promise<ApiResult<Category>> {
  const parsed = categoryInputSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;
  const { slugPt, slugEn, ...rest } = parsed.data;
  const slug = Object.fromEntries(Object.entries({ pt: slugPt, en: slugEn }).filter(([, value]) => value));
  return saveResource("panel/categories", categoryId, { ...rest, ...(Object.keys(slug).length ? { slug } : {}) },
    z.object({}).loose(), { permission: "taxonomy:manage", schema: categorySchema });
}

export async function removeCategory(categoryId: string): Promise<ApiResult> {
  return removeResource("panel/categories", categoryId, "taxonomy:manage");
}

export async function reorderCategories(ids: unknown): Promise<ApiResult> {
  return reorderResource("panel/categories", ids, "taxonomy:manage");
}

// --------------------------------------------------------------------------------------------- Media

const mediaQuerySchema = z.object({ search: z.string().trim().max(120).optional(), source: z.enum(["upload", "ai"]).optional(), page: z.number().int().min(1).max(10_000).optional() }).strict();

export async function listMedia(query: unknown): Promise<ApiResult<MediaList>> {
  const parsed = mediaQuerySchema.safeParse(query);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi(withQuery("panel/media", parsed.data), { permission: ["news:read", "media:manage"], schema: mediaListSchema });
}

export async function updateMedia(mediaId: string, values: unknown): Promise<ApiResult<MediaItem>> {
  return saveResource("panel/media", mediaId, values, mediaMetadataInputSchema, { permission: "media:manage", schema: mediaItemSchema });
}

export async function deleteMedia(mediaId: string): Promise<ApiResult> {
  return removeResource("panel/media", mediaId, "media:manage");
}

/** An image generated by the AI from a description: slow, it waits for the model. */
export async function generateMedia(input: unknown): Promise<ApiResult<MediaItem>> {
  const parsed = mediaGenerateInputSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi("panel/media/generate", { method: "POST", body: parsed.data, permission: "media:manage", schema: mediaItemSchema, revalidate: true, timeoutMs: SLOW_API_TIMEOUT_MS });
}

// --------------------------------------------------------------------------------------------- Front page

export async function saveFrontPage(input: unknown): Promise<ApiResult<FrontPage>> {
  const parsed = frontPageSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi("panel/front-page", { method: "PUT", body: parsed.data, permission: "front_page:manage", schema: frontPageSchema, revalidate: true });
}
