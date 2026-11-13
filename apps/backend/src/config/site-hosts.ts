/**
 * The single source of the portal's own host labels in the API. The frontend keeps the same contract in
 * `apps/frontend/src/config/site-hosts.ts`; `site-hosts.spec.ts` fails when they differ.
 *
 * Portal Meta News serves two areas only: the news site on the bare domain and the administrative panel on
 * `painel.<domain>`. The API answers on `api.<domain>`, reached only by the frontend's server.
 */
export const PANEL_SUBDOMAIN = 'painel';

/** Convenience names that only redirect to the panel's canonical host. */
export const PANEL_ALIASES = ['admin', 'panel'] as const;

/** The API's host (`api.<domain>`): the backend serves it at its root, and the frontend never serves it. */
export const API_SUBDOMAIN = 'api';

/** Names that only redirect to the site, on the bare domain. */
export const SITE_ALIASES = ['www'] as const;

/** The local hosts the frontend dev server answers on; development CORS widens to them, never further. */
export const LOCAL_SITE_HOSTS: readonly string[] = ['localhost', `${PANEL_SUBDOMAIN}.localhost`];

const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** The site's domain, validated: production refuses to start without a well-formed `SITE_DOMAIN`. */
export function parseSiteDomain(value: string): string {
  const domain = value.trim().toLowerCase();
  if (domain.length > 253 || !HOSTNAME.test(domain)) throw new Error('Invalid site domain configuration');
  return domain;
}

/** The public origin of each area for a domain, used in links the API writes (e-mails, feeds). */
export function siteOrigins(domain: string, secure: boolean, port?: number): { site: string; panel: string } {
  const suffix = port ? `:${port}` : '';
  const scheme = secure ? 'https' : 'http';
  return { site: `${scheme}://${domain}${suffix}`, panel: `${scheme}://${PANEL_SUBDOMAIN}.${domain}${suffix}` };
}
