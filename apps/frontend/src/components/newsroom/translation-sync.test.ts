import { describe, expect, it } from "vitest";
import { afterEdit, applyTranslation, emptyLocaleContent, isBlank, languageIsEmpty, resumeOverwrites, resumeRequest, type Content } from "./translation-sync";

const content = (pt: Partial<Content["pt"]> = {}, en: Partial<Content["en"]> = {}): Content =>
  ({ pt: { ...emptyLocaleContent(), ...pt }, en: { ...emptyLocaleContent(), ...en } });

describe("translation sync", () => {
  it("translates edits of the source language into the other", () => {
    expect(afterEdit({ enabled: true, source: "pt" }, content({ title: "Olá" }), "pt"))
      .toEqual({ sync: { enabled: true, source: "pt" }, translate: { from: "pt", to: "en" }, change: null });
  });

  it("pauses when the person writes in the other language", () => {
    expect(afterEdit({ enabled: true, source: "pt" }, content({ title: "Olá" }, { title: "Hello" }), "en"))
      .toEqual({ sync: { enabled: false, source: "pt" }, translate: null, change: "paused" });
  });

  it("adopts the language being written as the source while the source is still empty", () => {
    expect(afterEdit({ enabled: true, source: "pt" }, content({}, {}), "en"))
      .toEqual({ sync: { enabled: true, source: "en" }, translate: { from: "en", to: "pt" }, change: "adopted" });
    expect(afterEdit({ enabled: true, source: "pt" }, content({ body: "<p></p>" }), "en").change).toBe("adopted");
  });

  it("does nothing while sync is off", () => {
    expect(afterEdit({ enabled: false, source: "pt" }, content({ title: "Olá" }), "pt").translate).toBeNull();
  });

  it("treats empty editor markup as blank, but not an image", () => {
    expect(isBlank("body", "<p></p><p>&nbsp;</p>")).toBe(true);
    expect(isBlank("body", '<img src="/media/x/lg" alt="">')).toBe(false);
    expect(isBlank("title", "  ")).toBe(true);
    expect(languageIsEmpty(content({ seoTitle: "x" }), "pt")).toBe(false);
  });

  it("resumes with every field of the source and says when it overwrites", () => {
    const value = content({ title: "Olá", body: "<p>Corpo</p>" }, { title: "Hi" });
    expect(resumeRequest(value, "pt")).toMatchObject({ title: { text: "Olá", format: "plain" }, body: { text: "<p>Corpo</p>", format: "html" }, subtitle: { text: "" } });
    expect(resumeOverwrites(value, "pt")).toBe(true);
    expect(resumeOverwrites(content({ title: "Olá" }), "pt")).toBe(false);
  });

  it("drops stale translations and applies current ones", () => {
    const value = content({ title: "Olá" });
    const request = { from: "pt" as const, field: "title" as const, version: 2 };
    expect(applyTranslation(value, { enabled: true, source: "pt" }, request, 3, "Hello")).toBeNull();
    expect(applyTranslation(value, { enabled: false, source: "pt" }, request, 2, "Hello")).toBeNull();
    expect(applyTranslation(value, { enabled: true, source: "en" }, request, 2, "Hello")).toBeNull();
    expect(applyTranslation(value, { enabled: true, source: "pt" }, request, 2, "Hello")?.en.title).toBe("Hello");
  });
});
