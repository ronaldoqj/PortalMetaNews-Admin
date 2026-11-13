import { LOCAL_SITE_HOSTS } from './site-hosts.js';

export function corsOrigins(configuration: string, environment: string): string[] {
  const origins = configuration.split(',').map((value) => value.trim());
  for (const origin of origins) {
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error('Invalid CORS origin configuration'); }
    // A URL accepts `*` in a hostname, but origins are compared as exact text: `https://*.example.org` would never
    // match, and a real wildcard would trust every subdomain with credentials. Fail at startup instead.
    if (url.hostname.includes('*')) throw new Error('Invalid CORS origin configuration: wildcards are not allowed, list exact origins');
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) {
      throw new Error('Invalid CORS origin configuration');
    }
  }
  const allowed = new Set(origins);
  if (environment === 'development') {
    for (const origin of origins) {
      const url = new URL(origin);
      if (LOCAL_SITE_HOSTS.includes(url.hostname) || url.hostname === '127.0.0.1') {
        for (const host of LOCAL_SITE_HOSTS) {
          const target = new URL(origin);
          target.hostname = host;
          allowed.add(target.origin);
        }
      }
    }
  }
  return [...allowed];
}