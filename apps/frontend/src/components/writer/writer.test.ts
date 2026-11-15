import { describe, expect, it } from "vitest";
import { chosenStyle, DEFAULT_OPTIONS, writerEventSchema, writerOptionsSchema } from "./contracts";
import { markdownTree, parseSse } from "./writer-markdown";

describe("writer stream", () => {
  it("splits whole events and keeps the unfinished rest", () => {
    const { events, rest } = parseSse("event: delta\ndata: {\"type\":\"delta\",\"text\":\"Olá\"}\n\nevent: status\r\ndata: {\"type\":\"status\",\"stage\":\"structuring\"}\r\n\r\nevent: del");
    expect(events).toEqual([
      { event: "delta", data: "{\"type\":\"delta\",\"text\":\"Olá\"}" },
      { event: "status", data: "{\"type\":\"status\",\"stage\":\"structuring\"}" },
    ]);
    expect(rest).toBe("event: del");
    expect(parseSse(": keep-alive\n\n").events).toEqual([]);
  });

  it("accepts only the events the API sends", () => {
    expect(writerEventSchema.safeParse({ type: "delta", text: "x" }).success).toBe(true);
    expect(writerEventSchema.safeParse({ type: "status", stage: "illustrating" }).success).toBe(true);
    expect(writerEventSchema.safeParse({ type: "status", stage: "searching" }).success).toBe(false);
    expect(writerEventSchema.safeParse({ type: "script", text: "x" }).success).toBe(false);
  });

  it("drops raw HTML from the written article", () => {
    const tree = markdownTree("# Título\n\n<script>alert(1)</script>\n\n*linha fina*");
    expect(JSON.stringify(tree)).not.toContain("script");
    expect(JSON.stringify(tree)).toContain("Título");
  });
});

describe("editorial style choice", () => {
  const styles = [
    { id: "6f1e0c1a-8a0b-4a57-9d1b-1f0f4b3c2a10", name: "Padrão", isDefault: true },
    { id: "0b8f7a52-3c1d-4e2f-8a9b-7c6d5e4f3a21", name: "Técnico", isDefault: false },
  ];

  it("shows the chosen style, the default when none or a removed one is chosen, and no style when asked", () => {
    expect(chosenStyle(styles, styles[1].id)).toBe(styles[1].id);
    expect(chosenStyle(styles, null)).toBe(styles[0].id);
    expect(chosenStyle(styles, "9d3c2b1a-0f9e-4d8c-b7a6-5e4d3c2b1a09")).toBe(styles[0].id);
    expect(chosenStyle(styles, "none")).toBe("none");
    expect(chosenStyle([styles[1]], null)).toBe("none");
  });

  it("accepts a style id, none or the default as the conversation's choice, and nothing else", () => {
    expect(writerOptionsSchema.safeParse(DEFAULT_OPTIONS).success).toBe(true);
    expect(writerOptionsSchema.safeParse({ ...DEFAULT_OPTIONS, styleId: styles[1].id }).success).toBe(true);
    expect(writerOptionsSchema.safeParse({ ...DEFAULT_OPTIONS, styleId: "none" }).success).toBe(true);
    expect(writerOptionsSchema.safeParse({ ...DEFAULT_OPTIONS, styleId: "outro" }).success).toBe(false);
  });
});
