/** Text as XML character data or attribute value: the five predefined entities, and no control character survives. */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[character]!);
}

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
  /** Each language's address of the same page (`hreflang`), the page's own included. */
  languages?: Record<string, string>;
}

/** The sitemap protocol's `urlset`, each address with its other languages as `xhtml:link`. */
export function sitemapXml(entries: readonly SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const lines = [`<loc>${escapeXml(entry.url)}</loc>`];
    for (const [language, href] of Object.entries(entry.languages ?? {})) {
      lines.push(`<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(href)}"/>`);
    }
    if (entry.lastModified) lines.push(`<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`);
    if (entry.changeFrequency) lines.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
    if (entry.priority !== undefined) lines.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
    return `<url>${lines.join("")}</url>`;
  });
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">', ...urls, "</urlset>", ""].join("\n");
}

export interface RssChannel {
  title: string;
  link: string;
  /** The feed's own address (`atom:link rel="self"`). */
  self: string;
  description: string;
  language: string;
  image: string;
  items: ReadonlyArray<{ title: string; link: string; guid: string; publishedAt: string; description: string; category?: string; author?: string; image?: string }>;
}

/** An RSS 2.0 feed: the newest items with their summary, section and cover. */
export function rssXml(channel: RssChannel): string {
  const items = channel.items.map((item) => [
    "<item>",
    `<title>${escapeXml(item.title)}</title>`,
    `<link>${escapeXml(item.link)}</link>`,
    `<guid isPermaLink="false">${escapeXml(item.guid)}</guid>`,
    `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>`,
    `<description>${escapeXml(item.description)}</description>`,
    item.category ? `<category>${escapeXml(item.category)}</category>` : "",
    item.author ? `<dc:creator>${escapeXml(item.author)}</dc:creator>` : "",
    item.image ? `<enclosure url="${escapeXml(item.image)}" type="image/jpeg" length="0"/>` : "",
    "</item>",
  ].filter(Boolean).join(""));
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "<channel>",
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.link)}</link>`,
    `<atom:link href="${escapeXml(channel.self)}" rel="self" type="application/rss+xml"/>`,
    `<description>${escapeXml(channel.description)}</description>`,
    `<language>${escapeXml(channel.language)}</language>`,
    `<lastBuildDate>${new Date(channel.items[0]?.publishedAt ?? Date.now()).toUTCString()}</lastBuildDate>`,
    `<image><url>${escapeXml(channel.image)}</url><title>${escapeXml(channel.title)}</title><link>${escapeXml(channel.link)}</link></image>`,
    ...items,
    "</channel>", "</rss>", ""].join("\n");
}
