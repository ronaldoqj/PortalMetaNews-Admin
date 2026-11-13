import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as api from "../../../../backend/src/common/rich-text/rich-text";
import { RichTextContent } from "../shared/rich-text-content";
import { parseRichText, RICH_TEXT_MAX_HTML, RICH_TEXT_MAX_TEXT, richTextPlain, richTextReadable, serializeRichText } from "./rich-text";

/** Editor output, edge cases and markup the API refuses: both sides must read each the same way. */
const SAMPLES = [
  "<p>A <strong>bold</strong>, <em>italic</em> and <u>underlined <strong>mix</strong></u>.<br>Next</p>",
  "<ul><li><p>one</p></li><li><p>two</p><ol><li><p>nested</p></li></ol></li></ul><p></p>",
  "<ol start=\"4\"><li><p>four<br/></p></li></ol>",
  "<p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#x27; &nbsp;f &#128512;</p>",
  "<p></p>", "", "Plain", "<p class=\"x\">a</p>", "<p onclick=\"alert(1)\">a</p>", "<p>a</p><script>alert(1)</script>",
  "<p><a href=\"javascript:alert(1)\">x</a></p>", "<p><img src=x onerror=alert(1)></p>", "<h1>a</h1>", "<p>a</p><!-- c -->",
  "<p><strong>a</p>", "<p>a</p></p>", "<p><strong><em>a</strong></em></p>", "<ul>a</ul>", "<ul></ul>", "<ul><li></li></ul>",
  "<p>a & b</p>", "<p>&copy;</p>", "<p>&#xD800;</p>", "<p>a < b</p>", "<P>a</P>",
  `${"<ul><li><p>x</p>".repeat(20)}${"</li></ul>".repeat(20)}`,
];

describe("rich text", () => {
  it("reads every sample exactly as the API does", () => {
    expect([RICH_TEXT_MAX_HTML, RICH_TEXT_MAX_TEXT]).toEqual([api.RICH_TEXT_MAX_HTML, api.RICH_TEXT_MAX_TEXT]);
    for (const html of SAMPLES) {
      const ours = parseRichText(html);
      const theirs = api.parseRichText(html);
      expect(ours, html).toEqual(theirs);
      if (ours) {
        expect(serializeRichText(ours)).toBe(api.serializeRichText(theirs!));
        expect(richTextPlain(ours)).toBe(api.richTextPlain(theirs!));
      }
    }
  });

  it("measures readable text without markup", () => {
    expect(richTextReadable("<p>  <strong>ten chars!</strong> </p><p></p>")).toBe("ten chars!");
    expect(richTextReadable("Plain")).toBeNull();
  });

  it("renders a document as elements, never as injected markup", () => {
    const html = renderToStaticMarkup(<RichTextContent value={"<p>Hi <strong>there</strong> &lt;b&gt;</p><ol><li><p>one</p></li></ol>"} />);
    expect(html).toBe("<div class=\"rich-text-content\"><p>Hi <strong>there</strong> &lt;b&gt;</p><ol><li><p>one</p></li></ol></div>");
  });

  it("shows anything outside the grammar as plain, escaped text", () => {
    const html = renderToStaticMarkup(<RichTextContent value={"<p onclick=\"alert(1)\">x</p><script>alert(1)</script>"} />);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<p onclick");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
