import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd, newsArticleJsonLd, serializeJsonLd } from "./json-ld";
import { escapeXml, rssXml, sitemapXml } from "./xml";

describe("structured data", () => {
  it("never lets a title close the script element", () => {
    const text = serializeJsonLd({ headline: "</script><script>alert(1)</script> & \u2028" });
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(JSON.parse(text).headline).toBe("</script><script>alert(1)</script> & \u2028");
    expect(renderToStaticMarkup(<JsonLd data={{ a: "</script>" }} />)).toBe('<script type="application/ld+json">{"a":"\\u003c/script\\u003e"}</script>');
  });

  it("describes a news article for aggregators", () => {
    const data = newsArticleJsonLd({
      url: "https://x.org/pt/noticia/a", headline: "T".repeat(140), description: "D", images: ["https://x.org/media/1/og"], publishedAt: "2026-11-13T10:00:00.000Z",
      updatedAt: "2026-11-13T11:00:00.000Z", author: { name: "Ana", url: "https://x.org/pt/autor/1" }, publisher: { name: "Meta", logo: "https://x.org/l.png", url: "https://x.org" },
      section: "Política", keywords: ["a", "b"], language: "pt-BR",
    });
    expect(data).toMatchObject({ "@type": "NewsArticle", articleSection: "Política", keywords: "a, b", inLanguage: "pt-BR", author: [{ name: "Ana" }] });
    expect(data.headline).toHaveLength(110);
  });
});

describe("feeds and sitemaps", () => {
  it("escapes every predefined entity and drops control characters", () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'\u0001</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;");
  });

  it("writes an RSS 2.0 channel with escaped items", () => {
    const xml = rssXml({
      title: "Meta & News", link: "https://x.org/pt", self: "https://x.org/feed/pt", description: "D", language: "pt-BR", image: "https://x.org/s.jpg",
      items: [{ title: "A <b>", link: "https://x.org/pt/noticia/a?x=1&y=2", guid: "1", publishedAt: "2026-11-13T10:00:00.000Z", description: "S", category: "Política", image: "https://x.org/media/1/og" }],
    });
    expect(xml).toContain("<title>Meta &amp; News</title>");
    expect(xml).toContain("<title>A &lt;b&gt;</title>");
    expect(xml).toContain("<link>https://x.org/pt/noticia/a?x=1&amp;y=2</link>");
    expect(xml).toContain("<pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate>");
    expect(xml).toContain('<enclosure url="https://x.org/media/1/og" type="image/jpeg" length="0"/>');
  });

  it("lists each address with its languages", () => {
    const xml = sitemapXml([{ url: "https://x.org/pt", priority: 1, changeFrequency: "hourly", languages: { pt: "https://x.org/pt", en: "https://x.org/en" } }]);
    expect(xml).toContain("<loc>https://x.org/pt</loc>");
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://x.org/en"/>');
    expect(xml).toContain("<priority>1.0</priority>");
  });
});
