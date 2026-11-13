/**
 * The single source of the portal's own host labels in the frontend. The API keeps the same contract in
 * `apps/backend/src/config/site-hosts.ts`; its `site-hosts.spec.ts` fails when they differ.
 *
 * Two areas only: the news site on the bare domain and the administrative panel on `painel.<domain>`.
 */
export const PANEL_SUBDOMAIN = "painel";

/** Convenience names that only redirect to the panel's canonical host. */
export const PANEL_ALIASES = ["admin", "panel"] as const;

/** The API's host (`api.<domain>`): the backend serves it at its root, and the frontend never serves it. */
export const API_SUBDOMAIN = "api";

/** Names that only redirect to the site, on the bare domain. */
export const SITE_ALIASES = ["www"] as const;

const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * The site's domain (`SITE_DOMAIN`, identical in both projects). Production refuses to run without it; development
 * defaults to `localhost`, so the site answers on `localhost:3027` and the panel on `painel.localhost:3027`.
 */
export function siteDomain(): string {
  const value = process.env.SITE_DOMAIN?.trim().toLowerCase();
  if (process.env.NODE_ENV === "production" && !value) throw new Error("Missing site domain configuration");
  const domain = value || "localhost";
  if (domain.length > 253 || !HOSTNAME.test(domain)) throw new Error("Invalid site domain configuration");
  return domain;
}
