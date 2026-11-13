import "server-only";

import type { Metadata } from "next";
import { getPathname } from "../../i18n/navigation";
import { routing, type AppLocale } from "../../i18n/routing";
import { getRequestBranding } from "../../theme/request-branding";
import { siteUrl } from "../seo/site-url";

type Href = Parameters<typeof getPathname>[0]["href"];

export interface PageMetadataInput {
  locale: AppLocale;
  title: string;
  description: string;
  /** The page's address in each language it exists in; the current one is the canonical. Absent: not indexed. */
  hrefs?: Partial<Record<AppLocale, Href>>;
  /** An absolute or same-origin image for the shared link; the portal's share image otherwise. */
  image?: { url: string; width: number; height: number; alt: string };
  article?: { publishedTime: string; modifiedTime: string; section?: string; tags: string[]; authors: string[] };
  /** Search results and similar pages are useful to readers but not to an index. */
  noIndex?: boolean;
}

/**
 * The metadata of a page of the site: its canonical address and its other languages (`hreflang`), Open Graph and
 * Twitter cards with absolute URLs, and the `article:*` properties of a news item.
 */
export async function pageMetadata(input: PageMetadataInput): Promise<Metadata> {
  const { site, assets } = await getRequestBranding();
  const siteName = site?.siteName ?? "Portal Meta News";
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const href = input.hrefs?.[locale];
    if (href) languages[locale === "pt" ? "pt-BR" : "en"] = await siteUrl(getPathname({ locale, href }));
  }
  const ownHref = input.hrefs?.[input.locale];
  const canonical = ownHref ? await siteUrl(getPathname({ locale: input.locale, href: ownHref })) : undefined;
  if (canonical && input.hrefs?.pt) languages["x-default"] = languages["pt-BR"];
  const image = input.image ?? { url: assets.social, width: 1200, height: 630, alt: siteName };
  const imageUrl = image.url.startsWith("http") ? image.url : await siteUrl(image.url);
  return {
    title: input.title,
    description: input.description,
    alternates: canonical ? { canonical, languages } : undefined,
    robots: input.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: input.article ? "article" : "website",
      siteName, title: input.title, description: input.description, url: canonical, locale: input.locale === "pt" ? "pt_BR" : "en_US",
      images: [{ url: imageUrl, width: image.width, height: image.height, alt: image.alt }],
      ...(input.article ? {
        publishedTime: input.article.publishedTime, modifiedTime: input.article.modifiedTime, section: input.article.section,
        tags: input.article.tags, authors: input.article.authors,
      } : {}),
    },
    twitter: { card: "summary_large_image", title: input.title, description: input.description, images: [imageUrl] },
  };
}
