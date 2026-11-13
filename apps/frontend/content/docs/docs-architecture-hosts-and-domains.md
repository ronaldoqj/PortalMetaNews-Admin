# Hosts and areas

Who answers at each address and how a host becomes an area.

- One domain (`SITE_DOMAIN`, identical in both projects; `localhost` in development): the news site on the bare domain,
  the panel on `painel.<domain>` (`PANEL_SUBDOMAIN`), the API on `api.<domain>` (`API_SUBDOMAIN`). The labels live only in
  both `config/site-hosts.ts`, kept identical by a contract test.
- Aliases only redirect (308) to the canonical host: `admin.` and `panel.` to the panel, `www.` to the site (not in
  development). The session cookie therefore lives on a single host.
- The frontend's proxy (`src/proxy.ts`) resolves the area from the host (`theme/host-context.ts`), refuses a path of the other
  area (localized not-found page), redirects the bare root to the area's home in the visitor's language (cookie, then
  `Accept-Language`, then Portuguese), moves an address written in the other language's words to this language's, and
  passes the trusted `x-pmn-host`/`x-pmn-path` headers (any `x-pmn-*` a request brings is dropped).
- The panel's pages and its sign-in are `private, no-store`, `noindex` and `no-referrer`. The site's pages are public.
- The proxy does not run on relays and files: `/media/*`, `/brand-assets/*`, `/authors-avatar/*`, `/feed/*`, `/sitemap.xml`,
  `/robots.txt`, `/api/*` and `/<locale>/api/*`. Those handlers re-resolve the host from `Host` themselves.
- Only the frontend's server calls the API (`BACKEND_INTERNAL_URL`); `CORS_ORIGINS` lists exact origins, never wildcards.
