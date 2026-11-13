import type { I18nString } from '../../common/i18n/i18n-string.js';
import { CONTENT_LOCALES, type ContentLocale } from '../../common/i18n/locales.js';
import { lenientArticleHtml } from '../../common/rich-text/article-html.js';

/** One language of an article the AI proposed, ready for the builder. */
export interface ProposalVersion {
  title: string; subtitle: string; body: string; seoTitle: string; seoDescription: string; imageCaption: string;
}

/** What an answer of the AI writer proposes: the article in both languages, its section, tags and cover prompt. */
export interface Proposal {
  pt: ProposalVersion;
  en: ProposalVersion;
  categoryId: string | null;
  tags: I18nString[];
  imagePrompt: string;
  /** The draft created from it, once applied. */
  newsId?: string;
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * A model's structured answer as a proposal: every string bounded, bodies through the lenient article parser, the
 * section only when it names one of the portal's, at most five tags. `null` when no language has a title and a body.
 */
export function normalizeProposal(raw: unknown, categories: ReadonlyArray<{ id: string; slug: string }>): Proposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const answer = raw as Record<string, unknown>;
  const version = (value: unknown): ProposalVersion => {
    const entry = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    return {
      title: text(entry.title, 200), subtitle: text(entry.subtitle, 400),
      body: typeof entry.body === 'string' ? lenientArticleHtml(entry.body) : '',
      seoTitle: text(entry.seoTitle, 70), seoDescription: text(entry.seoDescription, 170), imageCaption: text(entry.imageCaption, 500),
    };
  };
  const versions = Object.fromEntries(CONTENT_LOCALES.map((locale) => [locale, version(answer[locale])])) as Record<ContentLocale, ProposalVersion>;
  if (!CONTENT_LOCALES.some((locale) => versions[locale].title && versions[locale].body)) return null;
  const category = categories.find((candidate) => candidate.slug === answer.category);
  const tags = (Array.isArray(answer.tags) ? answer.tags : []).flatMap((tag): I18nString[] => {
    if (!tag || typeof tag !== 'object') return [];
    const entry = { pt: text((tag as Record<string, unknown>).pt, 60), en: text((tag as Record<string, unknown>).en, 60) };
    return entry.pt || entry.en ? [Object.fromEntries(Object.entries(entry).filter(([, value]) => value))] : [];
  }).slice(0, 5);
  return { ...versions, categoryId: category?.id ?? null, tags, imagePrompt: text(answer.imagePrompt, 1000) };
}
