import "server-only";

import { cache } from "react";
import type { z } from "zod";
import type { ContentLocale } from "../../i18n/locales";
import { backendUrl } from "../admin/backend-url";
import { publishedLegalSchema, type LegalKind } from "../site-legal/contracts";
import { articleSchema, authorPageSchema, categoryPageSchema, feedSchema, homeSchema, newsPageSchema, sitemapSchema, tagPageSchema } from "./contracts";

/**
 * How the site reads the public API: from this server only, never cached, validated against the contracts. `null` means
 * "no such item" (404) and the page answers with its own not-found; any other failure throws to the error page.
 */
async function read<Data>(path: string, schema: z.ZodType<Data>, query: Record<string, string | number | undefined> = {}): Promise<Data | null> {
  const url = backendUrl(path);
  for (const [name, value] of Object.entries(query)) if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`Public API answered ${response.status}`);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Public API answer outside its contract");
  return parsed.data;
}

const segment = (value: string) => encodeURIComponent(value);

export const getHome = cache((locale: ContentLocale) => read("public/home", homeSchema, { locale }));
export const getArticle = cache((locale: ContentLocale, slug: string) => read(`public/news/by-slug/${segment(slug)}`, articleSchema, { locale }));
export const getNewsPage = cache((locale: ContentLocale, page: number, filter: { category?: string; tag?: string; author?: string; q?: string } = {}) =>
  read("public/news", newsPageSchema, { locale, page, ...filter }));
export const getMostRead = cache((locale: ContentLocale) => read("public/news/most-read", feedSchema, { locale }));
export const getCategory = cache((locale: ContentLocale, slug: string) => read(`public/categories/${segment(slug)}`, categoryPageSchema, { locale }));
export const getTag = cache((locale: ContentLocale, slug: string) => read(`public/tags/${segment(slug)}`, tagPageSchema, { locale }));
export const getAuthor = cache((locale: ContentLocale, id: string) => read(`public/authors/${segment(id)}`, authorPageSchema, { locale }));
export const getFeed = (locale: ContentLocale) => read("public/feed", feedSchema, { locale });
export const getSitemap = () => read("public/sitemap", sitemapSchema);
export const getLegal = cache((kind: LegalKind, locale: ContentLocale) => read(`public/legal/${kind}`, publishedLegalSchema, { locale }));

export { pageParameter, slugParameter } from "./params";
