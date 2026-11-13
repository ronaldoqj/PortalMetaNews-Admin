import sharp from 'sharp';
import { otherLocale, type ContentLocale } from '../i18n/locales.js';
import type { AiProvider, GeneratedImage, ImageInput, StructureInput, TranslateInput, WriteInput } from './ai-provider.js';

/** Milliseconds between the pieces of a streamed answer, so the interface behaves as with a remote model. */
const STREAM_DELAY_MS = 10;
const MARKERS: Record<ContentLocale, string> = { pt: '[PT] ', en: '[EN] ' };
const MARKER = /^\[(?:PT|EN)\] /;

/** FNV-1a, 32 bits: stable across processes. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

const sentences = (text: string) => text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Marks a text as "translated" into `to`, replacing any earlier marker: what the local provider can honestly do. */
export function simulateTranslation(text: string, format: 'plain' | 'html', to: ContentLocale): string {
  if (!text.trim()) return text;
  if (format === 'plain') return `${MARKERS[to]}${text.replace(MARKER, '')}`;
  // The first text of the first block carries the marker; the markup stays exactly as it was.
  return text.replace(/^(<(?:p|h2|h3|blockquote><p|ul><li><p|ol><li><p|li)[^>]*>)(?:\[(?:PT|EN)\] )?/, `$1${MARKERS[to]}`);
}

const COPY = {
  pt: {
    missing: '[confirmar: fontes e dados complementares]',
    context: 'Contexto',
    note: '_Rascunho gerado pelo provedor local, sem modelo de linguagem: configure um provedor de IA em Configurações → Inteligência artificial para redação real._',
    fallbackTitle: 'Nova pauta da redação',
    subtitle: 'Resumo do que se sabe até agora sobre o assunto.',
  },
  en: {
    missing: '[to confirm: sources and additional data]',
    context: 'Background',
    note: '_Draft written by the local provider, without a language model: configure an AI provider in Settings → Artificial intelligence for real writing._',
    fallbackTitle: 'New newsroom assignment',
    subtitle: 'A summary of what is known so far about the subject.',
  },
} as const;

/** The article a request of the editor yields without a model: the brief itself, arranged as a news article. */
export function localArticle(brief: string, language: ContentLocale): string {
  const copy = COPY[language];
  const parts = sentences(brief.replace(/[#*>_`]/g, ''));
  const title = (parts[0] ?? copy.fallbackTitle).replace(/[.!?]$/, '').slice(0, 100);
  const subtitle = parts[1] ?? copy.subtitle;
  const rest = parts.slice(2);
  const paragraphs: string[] = [];
  for (let index = 0; index < rest.length; index += 2) paragraphs.push(rest.slice(index, index + 2).join(' '));
  if (!paragraphs.length) paragraphs.push(parts.join(' ') || copy.fallbackTitle);
  const middle = Math.ceil(paragraphs.length / 2);
  return [`# ${title}`, `*${subtitle}*`, ...paragraphs.slice(0, middle), `## ${copy.context}`, ...paragraphs.slice(middle), copy.missing, copy.note]
    .filter(Boolean).join('\n\n');
}

interface ParsedArticle { title: string; subtitle: string; paragraphs: Array<{ kind: 'p' | 'h2' | 'blockquote'; text: string }> }

function parseMarkdown(article: string): ParsedArticle {
  const blocks = article.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  let title = '';
  let subtitle = '';
  const paragraphs: ParsedArticle['paragraphs'] = [];
  for (const block of blocks) {
    if (!title && block.startsWith('# ')) { title = block.slice(2).trim(); continue; }
    if (!subtitle && /^[*_].+[*_]$/.test(block)) { subtitle = block.slice(1, -1).trim(); continue; }
    if (/^_.*_$/.test(block)) continue;
    if (block.startsWith('## ')) paragraphs.push({ kind: 'h2', text: block.slice(3).trim() });
    else if (block.startsWith('> ')) paragraphs.push({ kind: 'blockquote', text: block.replace(/^> ?/gm, '').trim() });
    else paragraphs.push({ kind: 'p', text: block.replace(/\s+/g, ' ') });
  }
  return { title, subtitle, paragraphs };
}

function articleHtml(parsed: ParsedArticle, marker = ''): string {
  return parsed.paragraphs.map((block, index) => {
    const text = `${index === 0 ? marker : ''}${escapeHtml(block.text.replace(/\*\*(.+?)\*\*/g, '$1'))}`;
    return block.kind === 'blockquote' ? `<blockquote><p>${text}</p></blockquote>` : `<${block.kind}>${text}</${block.kind}>`;
  }).join('');
}

/** Words of the title long enough to name a subject, as tags. */
function tagsOf(title: string): Array<{ pt: string; en: string }> {
  const words = [...new Set(title.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 6).map((word) => word.toLowerCase()))].slice(0, 3);
  return words.map((word) => ({ pt: word, en: word }));
}

/**
 * The provider that needs no key and calls nobody, so a fresh installation exercises every AI flow offline: it marks
 * translations instead of translating ("[EN] ..."), arranges the editor's own brief as a draft, and draws an abstract
 * placeholder cover. It never invents a fact, and says so in every draft.
 */
export class LocalProvider implements AiProvider {
  readonly id = 'local' as const;
  readonly generative = false;
  readonly textModel = 'local-simulation-v1';
  readonly imageModel = 'local-placeholder-v1';

  constructor(private readonly delayMs: number = STREAM_DELAY_MS) {}

  async translate(input: TranslateInput): Promise<Record<string, string>> {
    return Object.fromEntries(Object.entries(input.fields).map(([key, field]) => [key, simulateTranslation(field.text, field.format, input.to)]));
  }

  async *write(input: WriteInput): AsyncIterable<string> {
    const brief = [...input.turns].reverse().find((turn) => turn.role === 'user')?.content ?? '';
    const article = localArticle(brief, input.language);
    for (const piece of article.match(/\S+\s*|\s+/g) ?? []) {
      if (input.signal?.aborted) return;
      yield piece;
      if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  async structure(input: StructureInput): Promise<unknown> {
    const parsed = parseMarkdown(input.article);
    const language: ContentLocale = /\[to confirm:|English/.test(input.article) && !/\[confirmar:/.test(input.article) ? 'en' : 'pt';
    const other = otherLocale(language);
    const version = (marker: string) => ({
      title: `${marker}${parsed.title}`, subtitle: `${marker}${parsed.subtitle}`, body: articleHtml(parsed, marker),
      seoTitle: `${marker}${parsed.title}`.slice(0, 65), seoDescription: `${marker}${parsed.subtitle}`.slice(0, 160),
      imageCaption: `${marker}${parsed.title}`.slice(0, 200),
    });
    return {
      [language]: version(''), [other]: version(MARKERS[other]),
      category: null, tags: tagsOf(parsed.title), imagePrompt: parsed.title,
    };
  }

  async image(input: ImageInput): Promise<GeneratedImage> {
    const seed = hash(input.prompt);
    const hue = seed % 360;
    const accent = (hue + 40 + (seed >> 9) % 80) % 360;
    const circles = Array.from({ length: 7 }, (_, index) => {
      const value = hash(`${input.prompt}:${index}`);
      return `<circle cx="${value % 1600}" cy="${(value >> 11) % 900}" r="${80 + (value >> 3) % 260}" fill="hsl(${(accent + index * 23) % 360} 70% 60%)" opacity="0.${2 + index % 5}"/>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 22%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 60% 40%)"/></linearGradient></defs>
      <rect width="1600" height="900" fill="url(#g)"/>${circles}
      <g fill="#ffffff" opacity="0.18"><rect x="120" y="640" width="620" height="22" rx="11"/><rect x="120" y="684" width="460" height="22" rx="11"/></g></svg>`;
    return { data: await sharp(Buffer.from(svg)).png().toBuffer(), mimeType: 'image/png' };
  }
}
