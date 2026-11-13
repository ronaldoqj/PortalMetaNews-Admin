import { describe, expect, it } from "vitest";
import { missingFor, patchOf, stateOf, type BuilderState } from "./builder-state";
import type { NewsView } from "./contracts";

const view: NewsView = {
  id: "8302f0e1-ed7a-43cf-990e-0fc650ef2109", status: "draft", title: { pt: "Olá" }, subtitle: {}, body: { pt: "<p>Corpo</p>" }, slug: { pt: "ola" },
  categoryId: null, category: null, coverMediaId: null, cover: null, coverCaption: {}, authorId: null, author: null, tags: [], locales: ["pt"],
  featured: false, breaking: false, seoTitle: {}, seoDescription: {}, translation: { enabled: true, source: "pt" }, aiAssisted: false, readingMinutes: { pt: 1 },
  views: 0, publishedAt: null, scheduledAt: null, createdAt: "2026-11-13T10:00:00.000Z", updatedAt: "2026-11-13T10:00:00.000Z", createdBy: null, updatedBy: null,
  permissions: { edit: true, publish: true, delete: true },
};

describe("builder state", () => {
  it("sends nothing when nothing changed", () => {
    const state = stateOf(view);
    expect(patchOf(state, stateOf(view))).toEqual({});
  });

  it("sends a changed field in both languages, a changed slug per language and the settings that moved", () => {
    const saved = stateOf(view);
    const current: BuilderState = {
      ...saved, content: { ...saved.content, en: { ...saved.content.en, title: "Hello", body: "<p></p>" } }, slug: { ...saved.slug, en: "hello" },
      featured: true, locales: ["pt", "en"], translation: { enabled: false, source: "pt" },
    };
    expect(patchOf(saved, current)).toEqual({
      title: { pt: "Olá", en: "Hello" }, body: { pt: "<p>Corpo</p>", en: "" }, slug: { en: "hello" }, featured: true, locales: ["pt", "en"],
      translation: { enabled: false, source: "pt" },
    });
  });

  it("names what a language lacks to be published", () => {
    expect(missingFor(stateOf(view), "pt")).toEqual([]);
    expect(missingFor(stateOf(view), "en")).toEqual(["title", "body"]);
  });
});
