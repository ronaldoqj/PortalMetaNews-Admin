/**
 * The plain formatted text people write outside articles (a reader's message through the contact form): paragraphs,
 * line breaks, bold, italic, underline and bulleted or numbered lists, as the editor writes them in HTML. It is parsed
 * strictly against that grammar, with no attributes at all, and stored in the canonical form this module serializes;
 * anything else is refused rather than cleaned, since only the editor posts it. Article bodies have their own, richer
 * grammar (`article-html.ts`).
 *
 * Keep in step with the frontend's `components/forms/rich-text.ts`, which renders the same grammar.
 */

type Mark = 'strong' | 'em' | 'u';
type ListTag = 'ul' | 'ol';
export type RichInline = { kind: 'text'; text: string } | { kind: 'br' } | { kind: Mark; children: RichInline[] };
export type RichBlock = { kind: 'p'; children: RichInline[] } | { kind: ListTag; items: RichBlock[][] };

/** Longest canonical HTML accepted for one text. */
export const RICH_TEXT_MAX_HTML = 100_000;
/** Longest readable text accepted for one text. */
export const RICH_TEXT_MAX_TEXT = 20_000;
/** Deepest element nesting accepted (lists inside lists). */
const MAX_DEPTH = 24;

const INLINE = new Set(['strong', 'em', 'u', 'br', '#text']);
const BLOCK = new Set(['p', 'ul', 'ol']);
const CHILDREN: Record<string, Set<string>> = {
  '#root': BLOCK, li: BLOCK, ul: new Set(['li']), ol: new Set(['li']), p: INLINE, strong: INLINE, em: INLINE, u: INLINE,
};
const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
/** One tag (an ordered list may carry the `start` the editor writes, which is dropped) or a run of text. */
const TOKEN = /<(\/?)(p|br|strong|em|u|ul|ol|li)(?: start="\d{1,6}")?\s*\/?>|([^<]+)/y;
const ENTITY = /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]+));/giy;

interface Open {
  tag: string;
  children: Array<RichInline | RichBlock | RichBlock[]>;
}

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

/** The document of `html`, or `null` when it is not exactly the grammar above. */
export function parseRichText(html: string): RichBlock[] | null {
  if (html.length > RICH_TEXT_MAX_HTML) return null;
  const stack: Open[] = [{ tag: '#root', children: [] }];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < html.length) {
    const match = TOKEN.exec(html);
    if (!match) return null;
    const parent = stack[stack.length - 1]!;
    const [, closing, tag, raw] = match;
    if (raw !== undefined) {
      if (!CHILDREN[parent.tag]!.has('#text')) {
        // The editor writes no whitespace between blocks; any other text there is not its output.
        return null;
      }
      const text = decode(raw);
      if (text === null) return null;
      parent.children.push({ kind: 'text', text });
      continue;
    }
    if (closing) {
      if (tag !== parent.tag || stack.length === 1) return null;
      stack.pop();
      const node = close(parent);
      if (!node) return null;
      stack[stack.length - 1]!.children.push(node);
      continue;
    }
    if (!CHILDREN[parent.tag]!.has(tag!)) return null;
    if (tag === 'br') {
      parent.children.push({ kind: 'br' });
      continue;
    }
    if (stack.length > MAX_DEPTH) return null;
    stack.push({ tag: tag!, children: [] });
  }
  if (stack.length !== 1) return null;
  return stack[0]!.children as RichBlock[];
}

function close({ tag, children }: Open): RichInline | RichBlock | RichBlock[] | null {
  switch (tag) {
    case 'p':
      return { kind: 'p', children: children as RichInline[] };
    case 'strong':
    case 'em':
    case 'u':
      return { kind: tag, children: children as RichInline[] };
    case 'li':
      return children.length ? children as RichBlock[] : null;
    case 'ul':
    case 'ol':
      return children.length ? { kind: tag, items: children as RichBlock[][] } : null;
    default:
      return null;
  }
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');

function inlineHtml(node: RichInline): string {
  if (node.kind === 'text') return escape(node.text);
  if (node.kind === 'br') return '<br>';
  return `<${node.kind}>${node.children.map(inlineHtml).join('')}</${node.kind}>`;
}

/** The canonical HTML of a document. */
export function serializeRichText(blocks: RichBlock[]): string {
  return blocks.map((block) => block.kind === 'p'
    ? `<p>${block.children.map(inlineHtml).join('')}</p>`
    : `<${block.kind}>${block.items.map((item) => `<li>${serializeRichText(item)}</li>`).join('')}</${block.kind}>`).join('');
}

function inlineText(node: RichInline): string {
  if (node.kind === 'text') return node.text;
  if (node.kind === 'br') return '\n';
  return node.children.map(inlineText).join('');
}

/** The readable text of a document, one line per paragraph and list item. */
export function richTextPlain(blocks: RichBlock[]): string {
  return blocks.map((block) => block.kind === 'p'
    ? block.children.map(inlineText).join('')
    : block.items.map((item) => richTextPlain(item)).join('\n')).join('\n');
}

/**
 * The canonical form of a submitted answer and its readable text, or `null` when it is not rich text.
 * Empty paragraphs at the end (the editor keeps one after a closing list) are dropped; a document with no
 * readable text is an empty answer, whose canonical form is `''`.
 */
export function canonicalRichText(html: string): { html: string; text: string } | null {
  const blocks = parseRichText(html);
  if (!blocks) return null;
  for (let last = blocks.at(-1); last?.kind === 'p' && !last.children.length; last = blocks.at(-1)) blocks.pop();
  const text = richTextPlain(blocks).trim();
  return text ? { html: serializeRichText(blocks), text } : { html: '', text: '' };
}

/** Plain text as rich text: one paragraph per line. Used by seeds and tests. */
export function richTextFromPlain(text: string): string {
  return text.split('\n').map((line) => `<p>${escape(line)}</p>`).join('');
}

/**
 * A required or optional rich text of a request, in canonical form: `null` when it is not rich text or its readable
 * text is longer than `maxText`; `''` when it is empty.
 */
export function richTextField(html: unknown, maxText: number = RICH_TEXT_MAX_TEXT): string | null {
  if (html === undefined || html === null || html === '') return '';
  if (typeof html !== 'string') return null;
  const canonical = canonicalRichText(html);
  return canonical && canonical.text.length <= maxText ? canonical.html : null;
}

/** The readable text of stored (canonical) rich text; `''` when it no longer parses. */
export function plainOfRichText(html: string | null | undefined): string {
  if (!html) return '';
  const blocks = parseRichText(html);
  return blocks ? richTextPlain(blocks).trim() : '';
}
