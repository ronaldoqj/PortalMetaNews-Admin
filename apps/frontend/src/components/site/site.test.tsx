import { describe, expect, it } from "vitest";
import { renderMarkup } from "@/test-support/render";
import { articleSchema, homeSchema, newsCardSchema, type NewsCard } from "./contracts";
import { NewsCardView } from "./news-card";
import { pageParameter, slugParameter } from "./params";

const card: NewsCard = {
  id: "f0bf61a4-2af8-4aac-95a2-5d77cb9404ef", title: "Título <b>", subtitle: "Linha fina", slug: "titulo", slugs: { pt: "titulo", en: "title" },
  publishedAt: "2026-11-13T15:33:28.451Z", updatedAt: "2026-11-13T15:33:28.451Z", readingMinutes: 3, breaking: false, featured: true,
  author: { id: "8fa10918-acec-4e7a-b763-a29b1141a082", name: "Rafael" },
  category: { id: "81294da6-1ba6-43f4-806c-05b269b94ade", name: "Tecnologia", slug: "tecnologia", color: "violet" },
  cover: { id: "deaafb73-5241-43c7-8386-c35443521aaa", width: 1600, height: 900, color: "#284888", alt: "Ilustração", source: "ai" },
};

describe("site contracts", () => {
  it("accept the API's cards, home and article, and refuse anything else", () => {
    expect(newsCardSchema.safeParse(card).success).toBe(true);
    expect(newsCardSchema.safeParse({ ...card, extra: 1 }).success).toBe(false);
    expect(homeSchema.safeParse({ headline: card, highlights: [], breaking: [], latest: [card], sections: [{ category: card.category, items: [card] }], mostRead: [] }).success).toBe(true);
    const article = {
      ...card, body: "<p>x</p>", aiAssisted: true, cover: { ...card.cover, caption: "C", credit: "Foto" }, seo: { title: "T", description: "D" },
      author: { id: card.author!.id, name: "Rafael", jobTitle: "Repórter", bio: "", avatar: null }, tags: [{ name: "a", slug: "a" }], media: [],
      related: [card], alternates: { pt: "titulo" },
    };
    expect(articleSchema.safeParse(article).success).toBe(true);
    expect(articleSchema.safeParse({ ...article, cover: card.cover }).success).toBe(false);
  });

  it("validate page numbers and slugs from the address", () => {
    expect(pageParameter("3")).toBe(3);
    expect([pageParameter("0"), pageParameter("x"), pageParameter("501"), pageParameter(undefined), pageParameter(["2", "4"])]).toEqual([1, 1, 1, 1, 2]);
    expect(slugParameter("noticia-de-hoje")).toBe("noticia-de-hoje");
    expect([slugParameter("../x"), slugParameter("Maiúscula"), slugParameter("%E0%A4%A"), slugParameter("a".repeat(161))]).toEqual([null, null, null, null]);
  });
});

describe("news card", () => {
  it("links the title and the section, escapes text, marks AI covers and serves responsive renditions", () => {
    const html = renderMarkup(<NewsCardView item={card} />, { now: new Date("2026-11-13T18:33:28.451Z") });
    expect(html).toContain('href="/pt/noticia/titulo"');
    expect(html).toContain('href="/pt/editoria/tecnologia"');
    expect(html).toContain("Título &lt;b&gt;");
    expect(html).toContain(">IA<");
    expect(html).toContain("/media/deaafb73-5241-43c7-8386-c35443521aaa/sm 480w");
    expect(html).toContain("3 min de leitura");
    expect(html).toContain("há 3 horas");
  });

  it("lays the headline over its cover, and lets a block leave out the section label and the subtitle", () => {
    const now = new Date("2026-11-13T18:33:28.451Z");
    expect(renderMarkup(<NewsCardView item={card} variant="lead" />, { now })).toContain("data-overlay");
    // Without a cover the headline is a plain block: there is no picture to lay the title over.
    expect(renderMarkup(<NewsCardView item={{ ...card, cover: null }} variant="lead" />, { now })).not.toContain("data-overlay");
    const plain = renderMarkup(<NewsCardView item={card} kicker={false} subtitle={false} />, { now });
    expect(plain).not.toContain('href="/pt/editoria/tecnologia"');
    expect(plain).not.toContain(card.subtitle);
    expect(plain).toContain('href="/pt/noticia/titulo"');
  });

  it("shows the breaking label instead of the section", () => {
    const html = renderMarkup(<NewsCardView item={{ ...card, breaking: true, cover: null }} variant="compact" />, { locale: "en", now: new Date("2026-11-20T00:00:00.000Z") });
    expect(html).toContain("Breaking");
    expect(html).not.toContain("/en/section/tecnologia");
    expect(html).toContain("Nov 13, 2026");
  });
});
