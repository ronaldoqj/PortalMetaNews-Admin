import "server-only";

import { headers } from "next/headers";
import { siteDomain } from "../../config/site-hosts";
import { getPathname } from "../../i18n/navigation";
import type { AppLocale } from "../../i18n/routing";
import { areaUrl, resolveHostContext, type Surface } from "../../theme/host-context";

type Href = Parameters<typeof getPathname>[0]["href"];

/** The host as the visitor asked for it (behind the reverse proxy, the forwarded one) and the area it serves. */
export async function requestHost(): Promise<{ host: string; surface?: Surface }> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() || requestHeaders.get("host") || siteDomain();
  try {
    return { host, surface: resolveHostContext(host, "/", siteDomain()).surface };
  } catch {
    return { host };
  }
}

/** An absolute URL on the site's host, for canonical links, Open Graph, JSON-LD, the sitemap and the feed. */
export async function siteUrl(path: string): Promise<string> {
  const { host } = await requestHost();
  return areaUrl("site", host, siteDomain(), path);
}

/** The absolute URL of a page of the site in a language. */
export async function pageUrl(locale: AppLocale, href: Href): Promise<string> {
  return siteUrl(getPathname({ locale, href }));
}
