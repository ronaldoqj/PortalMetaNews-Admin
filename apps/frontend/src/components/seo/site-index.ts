import "server-only";

import type { MetadataRoute } from "next";
import { getPathname } from "../../i18n/navigation";
import { routing, type AppLocale } from "../../i18n/routing";
import { getSitemap } from "../site/api";
import { requestHost, siteUrl } from "./site-url";
import type { SitemapEntry } from "./xml";

/**
 * What crawlers may read on the request's host: the site is open and names its sitemap; the panel (and any host that
 * serves nothing) is closed to them altogether. The API answers its own `robots.txt` on its host.
 */
export async function siteRobots(): Promise<MetadataRoute.Robots> {
  const { surface } = await requestHost();
  if (surface !== "site") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/pt/api/", "/en/api/"] }, sitemap: await siteUrl("/sitemap.xml") };
}

/**
 * The site's addresses for search engines: each language's home and latest news, every active section and every
 * published news item (in each language it is published in, with the others as `hreflang`). Empty on the panel's host.
 */
export async function siteSitemap(): Promise<SitemapEntry[]> {
  const { surface } = await requestHost();
  if (surface !== "site") return [];
  const data = await getSitemap();
  const entries: SitemapEntry[] = [];
  type Href = Parameters<typeof getPathname>[0]["href"];
  const languages = async (href: (locale: AppLocale) => Href | null): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    for (const locale of routing.locales) {
      const target = href(locale);
      if (target) result[locale === "pt" ? "pt-BR" : "en"] = await siteUrl(getPathname({ locale, href: target }));
    }
    return result;
  };
  for (const route of ["/site", "/site/latest"] as const) {
    const alternates = await languages(() => route);
    for (const url of Object.values(alternates)) entries.push({ url, changeFrequency: "hourly", priority: route === "/site" ? 1 : 0.8, languages: alternates });
  }
  for (const category of data?.categories ?? []) {
    const alternates = await languages((locale) => ({ pathname: "/site/category/[slug]", params: { slug: category.slugs[locale] } }));
    for (const url of Object.values(alternates)) entries.push({ url, changeFrequency: "hourly", priority: 0.7, languages: alternates });
  }
  for (const item of data?.news ?? []) {
    const alternates = await languages((locale) => (item.slugs[locale] ? { pathname: "/site/news/[slug]", params: { slug: item.slugs[locale]! } } : null));
    for (const url of Object.values(alternates)) entries.push({ url, lastModified: item.updatedAt, changeFrequency: "daily", priority: 0.6, languages: alternates });
  }
  return entries;
}
