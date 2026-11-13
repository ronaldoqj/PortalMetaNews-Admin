import { PANEL_ALIASES, PANEL_SUBDOMAIN, SITE_ALIASES } from "../config/site-hosts";
import { routeFromPathname, type RootRoute, type RouteArea } from "../i18n/routing";

export type Surface = RouteArea;
export interface HostContext {
  hostname: string;
  surface: Surface;
  rootRoute: RootRoute;
}

export function hostnameFromHost(host: string): string {
  if (!/^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(host)) throw new Error("Invalid host");
  const hostname = new URL(`http://${host}`).hostname.toLowerCase();
  if (hostname.length > 253 || hostname.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error("Invalid host");
  }
  return hostname;
}

export function siteHosts(domain: string): Record<Surface, string> {
  const base = hostnameFromHost(domain);
  return { site: base, panel: `${PANEL_SUBDOMAIN}.${base}` };
}

/**
 * Convenience names that only redirect to an area's canonical host and never serve it, so the session cookie stays
 * on a single host. `www` is left out in development: Next.js makes a redirect to its own `localhost` relative.
 */
export function hostAliases(domain: string): ReadonlyMap<string, Surface> {
  const base = hostnameFromHost(domain);
  return new Map<string, Surface>([
    ...PANEL_ALIASES.map((label) => [`${label}.${base}`, "panel"] as const),
    ...(base === "localhost" ? [] : SITE_ALIASES.map((label) => [`${label}.${base}`, "site"] as const)),
  ]);
}

/**
 * The area a host serves and whether the path is one of its pages: the site on the bare domain (and `127.0.0.1` in
 * development), the panel on `painel.`. Anything else throws, and the proxy answers the localized not-found page.
 */
export function resolveHostContext(host: string, pathname: string, domain: string): HostContext {
  const hostname = hostnameFromHost(host);
  const hosts = siteHosts(domain);
  const path = pathname.replace(/\/$/, "");
  const segments = path.split("/").filter(Boolean);
  const bare = segments.length === 0 || (segments.length === 1 && /^(pt|en)$/.test(segments[0]));
  if (hostname === hosts.panel) {
    if (!bare && !routeFromPathname(pathname, "panel")) throw new Error("Invalid panel path");
    return { hostname, surface: "panel", rootRoute: "/panel/dashboard" };
  }
  if (hostname === hosts.site || (hosts.site === "localhost" && hostname === "127.0.0.1")) {
    if (!bare && !routeFromPathname(pathname, "site")) throw new Error("Invalid site path");
    return { hostname, surface: "site", rootRoute: "/site" };
  }
  throw new Error("Unknown host");
}

/** The absolute URL of a path on an area's host, keeping the request's scheme and port. */
export function areaUrl(surface: Surface, requestHost: string, domain: string, pathname: string, secure = domain !== "localhost"): string {
  const port = new URL(`http://${requestHost}`).port;
  return `${secure ? "https" : "http"}://${siteHosts(domain)[surface]}${port ? `:${port}` : ""}${pathname}`;
}
