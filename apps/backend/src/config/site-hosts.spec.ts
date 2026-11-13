import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { API_SUBDOMAIN, LOCAL_SITE_HOSTS, PANEL_ALIASES, PANEL_SUBDOMAIN, SITE_ALIASES, parseSiteDomain, siteOrigins } from './site-hosts.js';

describe('site hosts', () => {
  it('keeps the frontend copy of the labels identical', () => {
    const frontend = readFileSync(fileURLToPath(new URL('../../../frontend/src/config/site-hosts.ts', import.meta.url)), 'utf8');
    expect(frontend).toContain(`export const PANEL_SUBDOMAIN = "${PANEL_SUBDOMAIN}";`);
    expect(frontend).toContain(`export const API_SUBDOMAIN = "${API_SUBDOMAIN}";`);
    expect(frontend).toContain(`export const PANEL_ALIASES = [${PANEL_ALIASES.map((alias) => `"${alias}"`).join(', ')}] as const;`);
    expect(frontend).toContain(`export const SITE_ALIASES = [${SITE_ALIASES.map((alias) => `"${alias}"`).join(', ')}] as const;`);
  });

  it('lists only the two local areas', () => {
    expect(LOCAL_SITE_HOSTS).toEqual(['localhost', 'painel.localhost']);
  });

  it.each(['metanews.com.br', 'localhost', 'portal.example.org'])('accepts the domain %s', (domain) => {
    expect(parseSiteDomain(` ${domain.toUpperCase()} `)).toBe(domain);
  });

  it.each(['', 'http://x.com', 'a..b', '-bad.com', 'x'.repeat(254)])('refuses the domain %s', (domain) => {
    expect(() => parseSiteDomain(domain)).toThrow();
  });

  it('derives the public origins of both areas', () => {
    expect(siteOrigins('localhost', false, 3027)).toEqual({ site: 'http://localhost:3027', panel: 'http://painel.localhost:3027' });
    expect(siteOrigins('metanews.com.br', true)).toEqual({ site: 'https://metanews.com.br', panel: 'https://painel.metanews.com.br' });
  });
});
