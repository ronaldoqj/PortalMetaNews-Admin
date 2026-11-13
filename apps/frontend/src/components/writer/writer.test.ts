import { describe, expect, it } from "vitest";
import { writerEventSchema } from "./contracts";
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
