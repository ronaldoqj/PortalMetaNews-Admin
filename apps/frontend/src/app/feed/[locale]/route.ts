import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resolveI18nString } from "@/i18n/i18n-string";
import { getFeed } from "@/components/site/api";
import { requestHost, siteUrl } from "@/components/seo/site-url";
import { rssXml } from "@/components/seo/xml";
import { getPublicSite } from "@/theme/request-branding";
import { brandingAssetUrls, bundledAssets } from "@/tokens/branding";

export const dynamic = "force-dynamic";

/** `/feed/pt` and `/feed/en`: RSS 2.0 of the newest news published in that language, on the site's host only. */
export async function GET(_request: Request, { params }: RouteContext<"/feed/[locale]">) {
  const { locale } = await params;
  const language = routing.locales.find((candidate) => candidate === locale);
  const { surface } = await requestHost();
  if (!language || surface !== "site") return new Response("Not found", { status: 404 });
  let items;
  let site;
  try {
    [items, site] = await Promise.all([getFeed(language), getPublicSite()]);
  } catch {
    return new Response("Feed unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const name = site?.siteName ?? "Portal Meta News";
  const xml = rssXml({
    title: name,
    link: await siteUrl(getPathname({ locale: language, href: "/site" })),
    self: await siteUrl(`/feed/${language}`),
    description: resolveI18nString(site?.description, language) || resolveI18nString(site?.tagline, language),
    language: language === "pt" ? "pt-BR" : "en",
    image: await siteUrl(site ? brandingAssetUrls(site.assets).logo : bundledAssets.logo),
    items: await Promise.all((items ?? []).map(async (item) => ({
      title: item.title,
      link: await siteUrl(getPathname({ locale: language, href: { pathname: "/site/news/[slug]", params: { slug: item.slug } } })),
      guid: item.id,
      publishedAt: item.publishedAt,
      description: item.subtitle,
      category: item.category?.name,
      author: item.author?.name,
      image: item.cover ? await siteUrl(`/media/${item.cover.id}/og`) : undefined,
    }))),
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
