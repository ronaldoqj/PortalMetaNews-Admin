/**
 * The body of a news article, as the builder's editor writes it in HTML: paragraphs, subheadings (`h2`, `h3`), lists,
 * quotes, separators, images of the media library and, inside text, bold, italic, underline, strike-through, line
 * breaks and links. It is parsed strictly against that grammar and stored in the canonical form this module
 * serializes; the site renders the parsed tree as React elements, never as injected markup.
 *
 * Attributes are a closed list: a link keeps only an `http(s)`/`mailto` `href` (the editor's `target`, `rel` and
 * `class` are dropped), an image keeps only a `src` of the media library (`/media/<id>/<size>`) and its `alt`.
 * Text from the AI (drafts, translations) goes through {@link lenientArticleHtml}, which unwraps what the grammar does
 * not know instead of refusing it.
 *
 * Mirrors the frontend's `components/forms/article-html.ts`; `article-html.spec.ts` checks both read the same grammar.
 */

type Mark = 'strong' | 'em' | 'u' | 's';
export type ArticleInline =
  | { kind: 'text'; text: string } | { kind: 'br' } | { kind: Mark; children: ArticleInline[] } | { kind: 'a'; href: string; children: ArticleInline[] };
export type ArticleBlock =
  | { kind: 'p' | 'h2' | 'h3'; children: ArticleInline[] }
  | { kind: 'ul' | 'ol'; items: ArticleBlock[][] }
  | { kind: 'blockquote'; blocks: ArticleBlock[] }
  | { kind: 'hr' }
  | { kind: 'img'; mediaId: string; size: MediaSize; alt: string };

export type MediaSize = 'sm' | 'md' | 'lg';
export const ARTICLE_MAX_HTML = 400_000;
export const ARTICLE_MAX_TEXT = 200_000;
const MAX_DEPTH = 24;
const MEDIA_SRC = /^\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(sm|md|lg)$/;
const SAFE_HREF = /^(?:https?:\/\/[^\s"<>]+|mailto:[^\s"<>@]+@[^\s"<>]+)$/i;

const INLINE = new Set(['strong', 'em', 'u', 's', 'a', 'br', '#text']);
const FLOW = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'blockquote', 'hr', 'img']);
const CHILDREN: Record<string, Set<string>> = {
  '#root': FLOW, li: new Set(['p', 'ul', 'ol']), ul: new Set(['li']), ol: new Set(['li']), blockquote: new Set(['p', 'ul', 'ol']),
  p: INLINE, h2: INLINE, h3: INLINE, strong: INLINE, em: INLINE, u: INLINE, s: INLINE, a: new Set(['strong', 'em', 'u', 's', 'br', '#text']),
};
const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const TOKEN = /<(\/?)([a-z][a-z0-9]*)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/y;
const ATTRIBUTE = /\s+([a-z-]+)(?:="([^"]*)")?/g;
const ENTITY = /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]+));/giy;

interface Open { tag: string; attributes: Record<string, string>; children: Array<ArticleInline | ArticleBlock | ArticleBlock[]> }

function decode(raw: string): string | null {
  let text = '';
  let index = 0;
  while (index < raw.length) {
    const amp = raw.indexOf('&', index);
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
    const value = decode(match[2] ?? '');
    if (value === null) return null;
    attributes[match[1]!] = value;
  }
  return attributes;
}

/** Attributes each tag may carry; the ones in `dropped` are accepted and forgotten (the editor writes them). */
const ALLOWED: Record<string, { kept: string[]; dropped: string[] }> = {
  a: { kept: ['href'], dropped: ['target', 'rel', 'class'] },
  img: { kept: ['src', 'alt'], dropped: ['title', 'class', 'width', 'height'] },
  ol: { kept: [], dropped: ['start', 'type'] },
};

function validAttributes(tag: string, attributes: Record<string, string>): boolean {
  const allowed = ALLOWED[tag] ?? { kept: [], dropped: [] };
  return Object.keys(attributes).every((name) => allowed.kept.includes(name) || allowed.dropped.includes(name));
}

/** The document of `html`, or `null` when it is not exactly the grammar above. */
export function parseArticleHtml(html: string): ArticleBlock[] | null {
  if (html.length > ARTICLE_MAX_HTML) return null;
  const stack: Open[] = [{ tag: '#root', attributes: {}, children: [] }];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < html.length) {
    const match = TOKEN.exec(html);
    if (!match) return null;
    const parent = stack[stack.length - 1]!;
    const [, closing, tag, rawAttributes, raw] = match;
    if (raw !== undefined) {
      if (!CHILDREN[parent.tag]!.has('#text')) {
        // The editor writes no text between blocks; whitespace there (from a model) is ignored, anything else refused.
        if (!raw.trim()) continue;
        return null;
      }
      const text = decode(raw);
      if (text === null) return null;
      parent.children.push({ kind: 'text', text });
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
    const attributes = attributesOf(rawAttributes ?? '');
    if (!attributes || !validAttributes(tag!, attributes)) return null;
    if (tag === 'br') { parent.children.push({ kind: 'br' }); continue; }
    if (tag === 'hr') { parent.children.push({ kind: 'hr' }); continue; }
    if (tag === 'img') {
      const media = MEDIA_SRC.exec(attributes.src ?? '');
      if (!media) return null;
      parent.children.push({ kind: 'img', mediaId: media[1]!, size: media[2] as MediaSize, alt: (attributes.alt ?? '').slice(0, 300) });
      continue;
    }
    if (tag === 'a' && !SAFE_HREF.test(attributes.href ?? '')) return null;
    if (stack.length > MAX_DEPTH) return null;
    stack.push({ tag: tag!, attributes, children: [] });
  }
  if (stack.length !== 1) return null;
  return stack[0]!.children as ArticleBlock[];
}

function close({ tag, attributes, children }: Open): ArticleInline | ArticleBlock | ArticleBlock[] | null {
  switch (tag) {
    case 'p': case 'h2': case 'h3': return { kind: tag, children: children as ArticleInline[] };
    case 'strong': case 'em': case 'u': case 's': return { kind: tag, children: children as ArticleInline[] };
    case 'a': return { kind: 'a', href: attributes.href!, children: children as ArticleInline[] };
    case 'li': return children.length ? children as ArticleBlock[] : null;
    case 'ul': case 'ol': return children.length ? { kind: tag, items: children as ArticleBlock[][] } : null;
    case 'blockquote': return children.length ? { kind: 'blockquote', blocks: children as ArticleBlock[] } : null;
    default: return null;
  }
}

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
const escapeAttribute = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inlineHtml(node: ArticleInline): string {
  if (node.kind === 'text') return escapeText(node.text);
  if (node.kind === 'br') return '<br>';
  if (node.kind === 'a') return `<a href="${escapeAttribute(node.href)}">${node.children.map(inlineHtml).join('')}</a>`;
  return `<${node.kind}>${node.children.map(inlineHtml).join('')}</${node.kind}>`;
}

/** The canonical HTML of a document. */
export function serializeArticleHtml(blocks: readonly ArticleBlock[]): string {
  return blocks.map((block) => {
    switch (block.kind) {
      case 'p': case 'h2': case 'h3': return `<${block.kind}>${block.children.map(inlineHtml).join('')}</${block.kind}>`;
      case 'ul': case 'ol': return `<${block.kind}>${block.items.map((item) => `<li>${serializeArticleHtml(item)}</li>`).join('')}</${block.kind}>`;
      case 'blockquote': return `<blockquote>${serializeArticleHtml(block.blocks)}</blockquote>`;
      case 'hr': return '<hr>';
      case 'img': return `<img src="/media/${block.mediaId}/${block.size}" alt="${escapeAttribute(block.alt)}">`;
    }
  }).join('');
}

function inlineText(node: ArticleInline): string {
  if (node.kind === 'text') return node.text;
  if (node.kind === 'br') return '\n';
  return node.children.map(inlineText).join('');
}

/** The readable text of a document, one line per block: what search indexes and reading time counts. */
export function articlePlainText(blocks: readonly ArticleBlock[]): string {
  return blocks.map((block) => {
    switch (block.kind) {
      case 'p': case 'h2': case 'h3': return block.children.map(inlineText).join('');
      case 'ul': case 'ol': return block.items.map((item) => articlePlainText(item)).join('\n');
      case 'blockquote': return articlePlainText(block.blocks);
      case 'hr': return '';
      case 'img': return block.alt;
    }
  }).filter(Boolean).join('\n');
}

/** Media items a document shows, so a deletion can say where an image is used. */
export function articleMediaIds(blocks: readonly ArticleBlock[]): string[] {
  return [...new Set(blocks.flatMap((block): string[] => {
    if (block.kind === 'img') return [block.mediaId];
    if (block.kind === 'ul' || block.kind === 'ol') return block.items.flatMap((item) => articleMediaIds(item));
    if (block.kind === 'blockquote') return articleMediaIds(block.blocks);
    return [];
  }))];
}

/**
 * The canonical form of a submitted body and its readable text, or `null` when it is not article HTML. Empty
 * paragraphs at both ends are dropped; a body with no readable text and no image is `''`.
 */
export function canonicalArticleHtml(html: string): { html: string; text: string } | null {
  const blocks = parseArticleHtml(html);
  if (!blocks) return null;
  const empty = (block: ArticleBlock | undefined) => block?.kind === 'p' && !block.children.length;
  while (empty(blocks.at(-1))) blocks.pop();
  while (empty(blocks[0])) blocks.shift();
  const text = articlePlainText(blocks).trim();
  return text || blocks.some((block) => block.kind === 'img') ? { html: serializeArticleHtml(blocks), text } : { html: '', text: '' };
}

/** Plain text as an article: one paragraph per non-empty line. */
export function articleFromPlain(text: string): string {
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeText(line)}</p>`).join('');
}

const BLOCK_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'img']);
const LOOSE_TOKEN = /<(\/?)([a-z][a-z0-9]*)[^>]*>|[^<]+/gi;

/** Text and inline markup a model left between blocks, wrapped in paragraphs. */
function wrapLoose(html: string): string {
  let output = '';
  let depth = 0;
  let open = false;
  for (const match of html.matchAll(LOOSE_TOKEN)) {
    const [whole, closing, tag] = match;
    const name = tag?.toLowerCase();
    const block = !!name && BLOCK_TAGS.has(name);
    if (depth === 0) {
      if (block && open) { output += '</p>'; open = false; }
      if (!block && !open && (name || whole.trim())) { output += '<p>'; open = true; }
    }
    output += whole;
    if (block && name !== 'hr' && name !== 'img') depth = Math.max(0, depth + (closing ? -1 : 1));
  }
  return open ? `${output}</p>` : output;
}

const UNWRAPPED = /<\/?(?!(?:p|h2|h3|ul|ol|li|blockquote|hr|img|br|strong|em|u|s|a)\b)[a-z][a-z0-9]*(?:\s[^>]*)?>/gi;
const RENAMED: Array<[RegExp, string]> = [[/<(\/?)b>/gi, '<$1strong>'], [/<(\/?)i>/gi, '<$1em>'], [/<(\/?)h[1]>/gi, '<$1h2>'], [/<(\/?)h[4-6]>/gi, '<$1h3>']];

/**
 * Article HTML from a model (a draft, a translation): synonyms renamed (`b`, `i`, `h1`, `h4`...), unknown tags
 * unwrapped, unknown attributes dropped, whitespace between blocks ignored; when the result still is not the grammar,
 * its text becomes plain paragraphs. Never returns markup the strict parser refuses.
 */
export function lenientArticleHtml(html: string): string {
  let cleaned = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n?/g, '\n');
  for (const [pattern, replacement] of RENAMED) cleaned = cleaned.replace(pattern, replacement);
  cleaned = cleaned.replace(UNWRAPPED, '')
    .replace(/<(p|h2|h3|ul|ol|li|blockquote|strong|em|u|s|br|hr)\s[^>]*?(\/?)>/gi, '<$1$2>')
    .replace(/<a\s[^>]*?href="([^"]*)"[^>]*>/gi, '<a href="$1">')
    .replace(/<img\s[^>]*?src="([^"]*)"[^>]*?(?:alt="([^"]*)")?[^>]*>/gi, (_match, src: string, alt?: string) => `<img src="${src}" alt="${alt ?? ''}">`)
    .replace(/>\s+</g, (gap) => (gap.includes('\n') ? '><' : gap))
    .trim();
  const canonical = canonicalArticleHtml(wrapLoose(cleaned));
  if (canonical) return canonical.html;
  const text = cleaned.replace(/<\/(p|h2|h3|li|blockquote)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  return canonicalArticleHtml(articleFromPlain(decode(text) ?? text))?.html ?? '';
}

/** Minutes a reader takes, at 220 words a minute; at least one. */
export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
