import { describe, expect, it } from "vitest";
import { parseMarkdown, resolveLink, textOf } from "./markdown";

type Node = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: Node[] };
const find = (node: Node, tag: string): Node | undefined => node.tagName === tag ? node : node.children?.map((child) => find(child, tag)).find(Boolean);

describe("documents", () => {
  it("leaves out the opening title and gives headings GitHub's ids, unique within the document", () => {
    const { tree, headings } = parseMarkdown("# Title\n\nIntro\n\n## 1. Agendar a reconciliação\n\n### Details\n\n## Details\n\n#### Deep\n");
    expect(find(tree as Node, "h1")).toBeUndefined();
    expect(headings).toEqual([
      { id: "1-agendar-a-reconciliação", text: "1. Agendar a reconciliação", level: 2 },
      { id: "details", text: "Details", level: 3 },
      { id: "details-1", text: "Details", level: 2 },
    ]);
  });

  it("keeps a first-level heading that does not open the document", () => {
    expect(find(parseMarkdown("Intro\n\n## Section\n\n# Later\n").tree as Node, "h1")).toBeDefined();
  });

  it("drops raw HTML, so markup in a document never reaches the page", () => {
    const { tree } = parseMarkdown("before <script>alert(1)</script> after\n\n<img src=x onerror=alert(1)>\n\n<iframe src=\"https://example.org\"></iframe>\n");
    expect(JSON.stringify(tree)).not.toMatch(/script|onerror|iframe/);
    expect(textOf(tree)).toContain("before");
  });

  it("marks GitHub alerts and removes their marker, leaving ordinary quotes alone", () => {
    const { tree } = parseMarkdown("> [!WARNING]\n> Careful.\n\n> Plain.\n");
    const quote = find(tree as Node, "blockquote");
    expect(quote?.properties?.dataAlert).toBe("warning");
    expect(textOf(tree)).not.toContain("[!WARNING]");
    expect(textOf(tree)).toContain("Careful.");
  });

  it("highlights code on the server, tolerating languages it does not know", () => {
    const block = find(parseMarkdown("```bash\nnpm run dev\n```\n").tree as Node, "pre");
    expect(block?.properties).toMatchObject({ dataCode: "npm run dev", dataLanguage: "bash" });
    expect(textOf(parseMarkdown("```qwerty\nsome text\n```\n").tree)).toContain("some text");
  });
});

describe("links", () => {
  it("tells anchors and pages outside apart", () => {
    expect(resolveLink("#section", "docs/a.md")).toEqual({ kind: "anchor", href: "#section" });
    expect(resolveLink("https://stripe.com", "docs/a.md")).toEqual({ kind: "external", href: "https://stripe.com" });
    expect(resolveLink("mailto:a@b.c", "docs/a.md").kind).toBe("external");
  });

  it("resolves repository paths from the document's folder", () => {
    expect(resolveLink("../README.md#ports", "docs/a.md")).toEqual({ kind: "file", path: "README.md", hash: "ports" });
    expect(resolveLink("../../README.md", "apps/backend/README.md")).toEqual({ kind: "file", path: "README.md", hash: undefined });
    expect(resolveLink("b.md", "docs/a.md")).toEqual({ kind: "file", path: "docs/b.md", hash: undefined });
    expect(resolveLink("src/app/[locale]/page.tsx", "apps/frontend/README.md")).toEqual({ kind: "file", path: "apps/frontend/src/app/[locale]/page.tsx", hash: undefined });
  });

  it("refuses paths above the repository and other schemes", () => {
    expect(resolveLink("../../etc/passwd", "docs/a.md")).toEqual({ kind: "none" });
    expect(resolveLink("javascript:alert(1)", "docs/a.md")).toEqual({ kind: "none" });
    expect(resolveLink("data:text/html,x", "docs/a.md")).toEqual({ kind: "none" });
    expect(resolveLink("//evil.example/x", "docs/a.md")).toEqual({ kind: "none" });
  });
});
