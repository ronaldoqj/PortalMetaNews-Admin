/**
 * The body of a news article: the grammar the builder's editor writes and the API stores (paragraphs, `h2`/`h3`,
 * lists, quotes, separators, media library images and, inside text, bold, italic, underline, strike-through, line
 * breaks and links). The site and the builder's preview parse the stored HTML here and render React elements
 * (`ArticleBody`), never injected markup.
 *
 * Mirrors the API's `common/rich-text/article-html.ts`; its `article-html.spec.ts` checks both read the same grammar.
 */

type Mark = "strong" | "em" | "u" | "s";
export type ArticleInline =
  | { kind: "text"; text: string } | { kind: "br" } | { kind: Mark; children: ArticleInline[] } | { kind: "a"; href: string; children: ArticleInline[] };
export type ArticleBlock =
  | { kind: "p" | "h2" | "h3"; children: ArticleInline[] }
  | { kind: "ul" | "ol"; items: ArticleBlock[][] }
  | { kind: "blockquote"; blocks: ArticleBlock[] }
  | { kind: "hr" }
  | { kind: "img"; mediaId: string; size: MediaSize; alt: string };

export type MediaSize = "sm" | "md" | "lg";
export const ARTICLE_MAX_HTML = 400_000;
export const ARTICLE_MAX_TEXT = 200_000;
const MAX_DEPTH = 24;
const MEDIA_SRC = /^\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(sm|md|lg)$/;
const SAFE_HREF = /^(?:https?:\/\/[^\s"<>]+|mailto:[^\s"<>@]+@[^\s"<>]+)$/i;

const INLINE = new Set(["strong", "em", "u", "s", "a", "br", "#text"]);
const FLOW = new Set(["p", "h2", "h3", "ul", "ol", "blockquote", "hr", "img"]);
const CHILDREN: Record<string, Set<string>> = {
  "#root": FLOW, li: new Set(["p", "ul", "ol"]), ul: new Set(["li"]), ol: new Set(["li"]), blockquote: new Set(["p", "ul", "ol"]),
  p: INLINE, h2: INLINE, h3: INLINE, strong: INLINE, em: INLINE, u: INLINE, s: INLINE, a: new Set(["strong", "em", "u", "s", "br", "#text"]),
};
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
const TOKEN = /<(\/?)([a-z][a-z0-9]*)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/y;
const ATTRIBUTE = /\s+([a-z-]+)(?:="([^"]*)")?/g;
const ENTITY = /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]+));/giy;

interface Open { tag: string; attributes: Record<string, string>; children: Array<ArticleInline | ArticleBlock | ArticleBlock[]> }

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
      : NAMED[match[3]!.toLowerCase()] ?? null;
    if (value === null) return null;
    text += value;
    index = ENTITY.lastIndex;
  }
  return text;
}

function attributesOf(raw: string): Record<string, string> | null {
  const attributes: Record<string, string> = {};
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const value = decode(match[2] ?? "");
    if (value === null) return null;
    attributes[match[1]!] = value;
  }
  return attributes;
}

/** Attributes each tag may carry; the ones in `dropped` are accepted and forgotten (the editor writes them). */
const ALLOWED: Record<string, { kept: string[]; dropped: string[] }> = {
  a: { kept: ["href"], dropped: ["target", "rel", "class"] },
  img: { kept: ["src", "alt"], dropped: ["title", "class", "width", "height"] },
  ol: { kept: [], dropped: ["start", "type"] },
};

function validAttributes(tag: string, attributes: Record<string, string>): boolean {
  const allowed = ALLOWED[tag] ?? { kept: [], dropped: [] };
  return Object.keys(attributes).every((name) => allowed.kept.includes(name) || allowed.dropped.includes(name));
}

/** The document of `html`, or `null` when it is not exactly the grammar above. */
export function parseArticleHtml(html: string): ArticleBlock[] | null {
  if (html.length > ARTICLE_MAX_HTML) return null;
  const stack: Open[] = [{ tag: "#root", attributes: {}, children: [] }];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < html.length) {
    const match = TOKEN.exec(html);
    if (!match) return null;
    const parent = stack[stack.length - 1]!;
    const [, closing, tag, rawAttributes, raw] = match;
    if (raw !== undefined) {
      if (!CHILDREN[parent.tag]!.has("#text")) {
        // The editor writes no text between blocks; whitespace there (from a model) is ignored, anything else refused.
        if (!raw.trim()) continue;
        return null;
      }
      const text = decode(raw);
      if (text === null) return null;
      parent.children.push({ kind: "text", text });
      continue;
    }
    if (closing) {
      if (tag !== parent.tag || stack.length === 1 || rawAttributes) return null;
      stack.pop();
      const node = close(parent);
      if (!node) return null;
      stack[stack.length - 1]!.children.push(node);
      continue;
    }
    if (!CHILDREN[parent.tag]!.has(tag!)) return null;
    const attributes = attributesOf(rawAttributes ?? "");
    if (!attributes || !validAttributes(tag!, attributes)) return null;
    if (tag === "br") { parent.children.push({ kind: "br" }); continue; }
    if (tag === "hr") { parent.children.push({ kind: "hr" }); continue; }
    if (tag === "img") {
      const media = MEDIA_SRC.exec(attributes.src ?? "");
      if (!media) return null;
      parent.children.push({ kind: "img", mediaId: media[1]!, size: media[2] as MediaSize, alt: (attributes.alt ?? "").slice(0, 300) });
      continue;
    }
    if (tag === "a" && !SAFE_HREF.test(attributes.href ?? "")) return null;
    if (stack.length > MAX_DEPTH) return null;
    stack.push({ tag: tag!, attributes, children: [] });
  }
  if (stack.length !== 1) return null;
  return stack[0]!.children as ArticleBlock[];
}

function close({ tag, attributes, children }: Open): ArticleInline | ArticleBlock | ArticleBlock[] | null {
  switch (tag) {
    case "p": case "h2": case "h3": return { kind: tag, children: children as ArticleInline[] };
    case "strong": case "em": case "u": case "s": return { kind: tag, children: children as ArticleInline[] };
    case "a": return { kind: "a", href: attributes.href!, children: children as ArticleInline[] };
    case "li": return children.length ? children as ArticleBlock[] : null;
    case "ul": case "ol": return children.length ? { kind: tag, items: children as ArticleBlock[][] } : null;
    case "blockquote": return children.length ? { kind: "blockquote", blocks: children as ArticleBlock[] } : null;
    default: return null;
  }
}

function inlineText(node: ArticleInline): string {
  if (node.kind === "text") return node.text;
  if (node.kind === "br") return "\n";
  return node.children.map(inlineText).join("");
}

/** The readable text of a document, one line per block: what search indexes and reading time counts. */
export function articlePlainText(blocks: readonly ArticleBlock[]): string {
  return blocks.map((block) => {
    switch (block.kind) {
      case "p": case "h2": case "h3": return block.children.map(inlineText).join("");
      case "ul": case "ol": return block.items.map((item) => articlePlainText(item)).join("\n");
      case "blockquote": return articlePlainText(block.blocks);
      case "hr": return "";
      case "img": return block.alt;
    }
  }).filter(Boolean).join("\n");
}

/** Media items a document shows, so a deletion can say where an image is used. */
export function articleMediaIds(blocks: readonly ArticleBlock[]): string[] {
  return [...new Set(blocks.flatMap((block): string[] => {
    if (block.kind === "img") return [block.mediaId];
    if (block.kind === "ul" || block.kind === "ol") return block.items.flatMap((item) => articleMediaIds(item));
    if (block.kind === "blockquote") return articleMediaIds(block.blocks);
    return [];
  }))];
}
