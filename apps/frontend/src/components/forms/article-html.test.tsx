import { describe, expect, it } from "vitest";
import { articlePlainText, parseArticleHtml } from "./article-html";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleBody } from "./article-body";

const MEDIA = "0b0e7a3c-2f1d-4f43-9d50-0e8b8f2c1a11";

describe("article body", () => {
  it("parses the stored grammar and refuses anything else", () => {
    const blocks = parseArticleHtml(`<p>Olá &amp; <a href="https://x.org">link</a></p><h2>T</h2><img src="/media/${MEDIA}/lg" alt="Foto">`);
    expect(articlePlainText(blocks!)).toBe("Olá & link\nT\nFoto");
    expect(parseArticleHtml("<script>x</script>")).toBeNull();
    expect(parseArticleHtml("<p onclick=\"x\">a</p>")).toBeNull();
  });

  it("renders elements, never markup from the text, and opens external links apart", () => {
    const markup = renderToStaticMarkup(<ArticleBody labels={{ aiImage: "IA" }} html={`<p>&lt;b&gt; <a href="https://x.org">x</a></p><img src="/media/${MEDIA}/lg" alt="A">`}
      media={[{ id: MEDIA, width: 1600, height: 900, color: "#123456", alt: "A", caption: "Legenda", credit: "Foto", source: "ai" }]} />);
    expect(markup).toContain("&lt;b&gt;");
    expect(markup).toContain('rel="noopener noreferrer nofollow"');
    expect(markup).toContain(`srcSet="/media/${MEDIA}/sm 480w`);
    expect(markup).toContain("Legenda — IA · Foto");
  });
});
