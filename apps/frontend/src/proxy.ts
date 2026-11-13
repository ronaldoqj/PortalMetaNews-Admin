import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { siteDomain } from "./config/site-hosts";
import { getPathname, localizedPathname } from "./i18n/navigation";
import { isAuthenticationPath, routing, routingForSurface, type AppLocale } from "./i18n/routing";
import { areaUrl, hostAliases, hostnameFromHost, resolveHostContext, siteHosts } from "./theme/host-context";

const internationalize = {
  site: createMiddleware(routingForSurface("site")),
  panel: createMiddleware(routingForSurface("panel")),
};

function privateResponse(response: NextResponse, sensitive: boolean) {
  if (sensitive) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

/**
 * The host the visitor asked for. Behind the reverse proxy it also travels as `x-forwarded-host`, which Next.js keeps
 * when, after a Server Action redirects, it fetches the next page from this server at its own internal address.
 */
function visitorHost(request: NextRequest): string {
  return request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || "";
}

/** Request headers with every `x-pmn-*` a request brings dropped: only the proxy sets them. */
function trustedHeaders(request: NextRequest, hostname: string, pathname: string): Headers {
  const forwarded = new Headers(request.headers);
  forwarded.set("host", visitorHost(request));
  for (const name of [...forwarded.keys()]) if (name.startsWith("x-pmn-")) forwarded.delete(name);
  forwarded.set("x-pmn-host", hostname);
  forwarded.set("x-pmn-path", pathname);
  return forwarded;
}

/** The localized not-found page, for an address no area serves, drawn as the site's. */
function notFoundPage(request: NextRequest, domain: string) {
  const segment = request.nextUrl.pathname.split("/")[1];
  const locale: AppLocale = routing.locales.find((candidate) => candidate === segment) ?? routing.defaultLocale;
  const target = request.nextUrl.clone();
  target.pathname = `/${locale}/page-not-found`;
  target.search = "";
  return privateResponse(NextResponse.rewrite(target, { request: { headers: trustedHeaders(request, siteHosts(domain).site, `/${locale}`) } }), true);
}

export default function proxy(request: NextRequest) {
  const domain = siteDomain();
  const host = visitorHost(request);
  let context;
  try {
    const aliased = hostAliases(domain).get(hostnameFromHost(host));
    if (aliased) {
      const target = new URL(areaUrl(aliased, host, domain, request.nextUrl.pathname));
      target.search = request.nextUrl.search;
      return privateResponse(NextResponse.redirect(target, 308), true);
    }
    context = resolveHostContext(host, request.nextUrl.pathname, domain);
  } catch {
    return notFoundPage(request, domain);
  }
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const panel = context.surface === "panel";
  const prefixed = routing.locales.find((candidate) => candidate === segments[0]);
  // An unprefixed address reopens the language last chosen (next-intl's cookie); else the browser's, else Portuguese.
  const preferred = routing.locales.find((candidate) => candidate === request.cookies.get("NEXT_LOCALE")?.value);
  const browser = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : undefined;
  const locale: AppLocale = prefixed ?? preferred ?? browser ?? routing.defaultLocale;
  const isRoot = segments.length === 0 || (segments.length === 1 && segments[0] === locale);
  const contextualUrl = request.nextUrl.clone();
  contextualUrl.hostname = context.hostname;
  contextualUrl.port = new URL(`http://${host}`).port;
  const sensitive = panel || isAuthenticationPath(pathname, context.surface);
  if (isRoot && (panel || !prefixed)) {
    const target = contextualUrl.clone();
    target.pathname = getPathname({ locale, href: context.rootRoute });
    return privateResponse(NextResponse.redirect(target), sensitive);
  }
  // An address in the other language's words moves to this language's (`/en/noticia/x` → `/en/news/x`).
  const cleanPath = isRoot ? undefined : localizedPathname(pathname, context.surface, locale);
  if (cleanPath && decodeURIComponent(pathname).replace(/\/$/, "") !== decodeURIComponent(cleanPath)) {
    const target = contextualUrl.clone();
    target.pathname = cleanPath;
    return privateResponse(NextResponse.redirect(target), sensitive);
  }
  const response = internationalize[context.surface](new NextRequest(contextualUrl, {
    headers: trustedHeaders(request, context.hostname, pathname), method: request.method,
  }));
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (rewrite) {
    const internalUrl = new URL(rewrite);
    internalUrl.protocol = request.nextUrl.protocol;
    internalUrl.host = request.nextUrl.host;
    response.headers.set("x-middleware-rewrite", internalUrl.toString());
  }
  return privateResponse(response, sensitive);
}

export const config = {
  // `/<locale>/api/` holds the panel's stream and upload relays: the proxy would buffer their bodies, and they re-resolve
  // the host themselves. `/media`, `/brand`, `/feed` and files are public resources, not pages.
  matcher: "/((?!api|_next|_vercel|media/|brand-assets/|authors-avatar/|feed/|sitemap.xml|robots.txt|(?:pt|en)/api/|.*\\..*).*)",
};
