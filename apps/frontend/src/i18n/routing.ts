import { defineRouting } from "next-intl/routing";

/**
 * Every page of the two areas, by an internal route (`/site/...`, `/panel/...`) and its clean, localized address.
 * One page implementation per route; the address in each language comes from here, never from a component.
 */
const sitePathnames = {
  "/site": "/",
  "/site/news/[slug]": { pt: "/noticia/[slug]", en: "/news/[slug]" },
  "/site/latest": { pt: "/ultimas", en: "/latest" },
  "/site/category/[slug]": { pt: "/editoria/[slug]", en: "/section/[slug]" },
  "/site/tag/[slug]": { pt: "/tag/[slug]", en: "/tag/[slug]" },
  "/site/author/[id]": { pt: "/autor/[id]", en: "/author/[id]" },
  "/site/search": { pt: "/busca", en: "/search" },
  "/site/contact": { pt: "/fale-conosco", en: "/contact" },
  "/site/privacy": { pt: "/privacidade", en: "/privacy" },
  "/site/terms": { pt: "/termos-de-uso", en: "/terms-of-use" },
} as const;

const panelPathnames = {
  "/panel/dashboard": "/dashboard",
  "/panel/news": { pt: "/noticias", en: "/news" },
  // Before `[id]`, so the creation pages are never read as an id.
  "/panel/news/new": { pt: "/noticias/nova", en: "/news/new" },
  "/panel/news/[id]": { pt: "/noticias/[id]", en: "/news/[id]" },
  "/panel/ai-writer": { pt: "/redator-ia", en: "/ai-writer" },
  "/panel/ai-writer/[id]": { pt: "/redator-ia/[id]", en: "/ai-writer/[id]" },
  "/panel/front-page": { pt: "/capa", en: "/front-page" },
  "/panel/categories": { pt: "/editorias", en: "/sections" },
  "/panel/tags": "/tags",
  "/panel/media": { pt: "/midia", en: "/media" },
  "/panel/themes": { pt: "/temas", en: "/themes" },
  "/panel/themes/[id]": { pt: "/temas/[id]", en: "/themes/[id]" },
  "/panel/branding": { pt: "/identidade-visual", en: "/branding" },
  "/panel/access": { pt: "/equipe-e-perfis", en: "/team-and-roles" },
  "/panel/contacts": { pt: "/mensagens", en: "/messages" },
  "/panel/contacts/[id]": { pt: "/mensagens/[id]", en: "/messages/[id]" },
  "/panel/settings": { pt: "/configuracoes", en: "/settings" },
  "/panel/settings/site": { pt: "/configuracoes/site", en: "/settings/site" },
  "/panel/settings/ai": { pt: "/configuracoes/inteligencia-artificial", en: "/settings/ai" },
  "/panel/settings/email": { pt: "/configuracoes/email-smtp", en: "/settings/email-smtp" },
  "/panel/settings/storage": { pt: "/configuracoes/armazenamento", en: "/settings/storage" },
  "/panel/site/privacy": { pt: "/site/privacidade", en: "/site/privacy" },
  "/panel/site/terms": { pt: "/site/termos-de-uso", en: "/site/terms-of-use" },
  "/panel/audit": { pt: "/auditoria", en: "/audit" },
  "/panel/documentation": { pt: "/documentacao", en: "/documentation" },
  "/panel/documentation/[id]": { pt: "/documentacao/[id]", en: "/documentation/[id]" },
  "/panel/profile": { pt: "/meu-perfil", en: "/my-profile" },
  "/panel/login": "/login",
  "/panel/first-access": { pt: "/primeiro-acesso", en: "/first-access" },
} as const;

export const areaPathnames = { site: sitePathnames, panel: panelPathnames };
export type RouteArea = keyof typeof areaPathnames;

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "always",
  pathnames: { ...sitePathnames, ...panelPathnames },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppRoute = keyof typeof routing.pathnames;
export type RootRoute = "/site" | "/panel/dashboard";

export function routingForSurface(surface: RouteArea) {
  const pathnames: Record<string, string | Record<AppLocale, string>> = areaPathnames[surface];
  return defineRouting({ ...routing, pathnames });
}

/** The internal route a pathname of an area is, whatever its language prefix, or undefined. */
export function routeFromPathname(pathname: string, surface: RouteArea): AppRoute | undefined {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return undefined; }
  const segments = decoded.replace(/\/$/, "").split("/").filter(Boolean);
  const locale = routing.locales.find((candidate) => candidate === segments[0]);
  const path = `/${segments.slice(locale ? 1 : 0).join("/")}`;
  const pathnames = routingForSurface(surface).pathnames;
  const matches = (expected: string) => {
    if (path === expected) return true;
    const actualSegments = path.split("/").filter(Boolean);
    const expectedSegments = expected.split("/").filter(Boolean);
    return actualSegments.length === expectedSegments.length && expectedSegments.every((segment, index) =>
      (segment.startsWith("[") && segment.endsWith("]")) || segment === actualSegments[index]);
  };
  const routes = Object.keys(pathnames) as AppRoute[];
  // A fixed address (`/noticias/nova`) wins over a parameter (`/noticias/[id]`).
  return routes.find((route) => { const current = pathnames[route]; return path === (typeof current === "string" ? current : current[locale ?? routing.defaultLocale]); })
    ?? routes.find((route) => { const current = pathnames[route]; return matches(typeof current === "string" ? current : current[locale ?? routing.defaultLocale]); });
}

/** The pages that open or replace a credential: never cached, never indexed, never referred from. */
const AUTHENTICATION_ROUTES: readonly string[] = ["/panel/login", "/panel/first-access"];

export function isAuthenticationPath(pathname: string, surface: RouteArea): boolean {
  const route = routeFromPathname(pathname, surface);
  return !!route && AUTHENTICATION_ROUTES.includes(route);
}
