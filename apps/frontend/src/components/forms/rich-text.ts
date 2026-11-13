/**
 * The plain formatted text of the contact form and other short texts: paragraphs, line breaks, bold, italic, underline
 * and bulleted or numbered lists, without any attribute. The API stores it only in this canonical HTML; the panel reads
 * it back here to render React elements, never by injecting markup. Article bodies use `article-html.ts`.
 *
 * Mirrors the API's `common/rich-text/rich-text.ts`; `rich-text.test.ts` checks both read the same grammar.
 */

type Mark = "strong" | "em" | "u";
type ListTag = "ul" | "ol";
export type RichInline = { kind: "text"; text: string } | { kind: "br" } | { kind: Mark; children: RichInline[] };
export type RichBlock = { kind: "p"; children: RichInline[] } | { kind: ListTag; items: RichBlock[][] };

/** Longest canonical HTML the API accepts for one answer. */
export const RICH_TEXT_MAX_HTML = 100_000;
/** Longest readable text the API accepts for one answer. */
export const RICH_TEXT_MAX_TEXT = 20_000;
const MAX_DEPTH = 24;

const INLINE = new Set(["strong", "em", "u", "br", "#text"]);
const BLOCK = new Set(["p", "ul", "ol"]);
const CHILDREN: Record<string, Set<string>> = {
  "#root": BLOCK, li: BLOCK, ul: new Set(["li"]), ol: new Set(["li"]), p: INLINE, strong: INLINE, em: INLINE, u: INLINE,
};
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
const TOKEN = /<(\/?)(p|br|strong|em|u|ul|ol|li)(?: start="\d{1,6}")?\s*\/?>|([^<]+)/y;
const ENTITY = /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]+));/giy;

type Open = { tag: string; children: Array<RichInline | RichBlock | RichBlock[]> };

function decode(raw: string): string | null {
  let text = "";
  let index = 0;
  while (index < raw.length) {
    const amp = raw.indexOf("&", index);
    if (amp === -1) return text + raw.slice(index);
    text += raw.slice(index, amp);
    ENTITY.lastIndex = amp;
    const match = ENTITY.exec(raw);
    if (!match) return null;
    const code = match[1] ? Number(match[1]) : match[2] ? parseInt(match[2], 16) : undefined;
    const value = code !== undefined
      ? code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : null
      : NAMED[match[3].toLowerCase()] ?? null;
    if (value === null) return null;
    text += value;
    index = ENTITY.lastIndex;
  }
  return text;
}

function close({ tag, children }: Open): RichInline | RichBlock | RichBlock[] | null {
  switch (tag) {
    case "p": return { kind: "p", children: children as RichInline[] };
    case "strong": case "em": case "u": return { kind: tag, children: children as RichInline[] };
    case "li": return children.length ? children as RichBlock[] : null;
    case "ul": case "ol": return children.length ? { kind: tag, items: children as RichBlock[][] } : null;
    default: return null;
  }
}

/** The document of `html`, or `null` when it is not exactly the grammar above. */
export function parseRichText(html: string): RichBlock[] | null {
  if (html.length > RICH_TEXT_MAX_HTML) return null;
  const stack: Open[] = [{ tag: "#root", children: [] }];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < html.length) {
    const match = TOKEN.exec(html);
    if (!match) return null;
    const parent = stack[stack.length - 1];
    const [, closing, tag, raw] = match;
    if (raw !== undefined) {
      if (!CHILDREN[parent.tag].has("#text")) return null;
      const text = decode(raw);
      if (text === null) return null;
      parent.children.push({ kind: "text", text });
      continue;
    }
    if (closing) {
      if (tag !== parent.tag || stack.length === 1) return null;
      stack.pop();
      const node = close(parent);
      if (!node) return null;
      stack[stack.length - 1].children.push(node);
      continue;
    }
    if (!CHILDREN[parent.tag].has(tag)) return null;
    if (tag === "br") {
      parent.children.push({ kind: "br" });
      continue;
    }
    if (stack.length > MAX_DEPTH) return null;
    stack.push({ tag, children: [] });
  }
  return stack.length === 1 ? stack[0].children as RichBlock[] : null;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");

function inlineHtml(node: RichInline): string {
  if (node.kind === "text") return escape(node.text);
  if (node.kind === "br") return "<br>";
  return `<${node.kind}>${node.children.map(inlineHtml).join("")}</${node.kind}>`;
}

/** The canonical HTML of a document, as the API stores it. */
export function serializeRichText(blocks: RichBlock[]): string {
  return blocks.map((block) => block.kind === "p"
    ? `<p>${block.children.map(inlineHtml).join("")}</p>`
    : `<${block.kind}>${block.items.map((item) => `<li>${serializeRichText(item)}</li>`).join("")}</${block.kind}>`).join("");
}

function inlineText(node: RichInline): string {
  if (node.kind === "text") return node.text;
  if (node.kind === "br") return "\n";
  return node.children.map(inlineText).join("");
}

/** The readable text of a document, one line per paragraph and list item. */
export function richTextPlain(blocks: RichBlock[]): string {
  return blocks.map((block) => block.kind === "p"
    ? block.children.map(inlineText).join("")
    : block.items.map((item) => richTextPlain(item)).join("\n")).join("\n");
}

/** The readable text of `html`, trimmed; `null` when it is not rich text. */
export function richTextReadable(html: string): string | null {
  const blocks = parseRichText(html);
  return blocks ? richTextPlain(blocks).trim() : null;
}
