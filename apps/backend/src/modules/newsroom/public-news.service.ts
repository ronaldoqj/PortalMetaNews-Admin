import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { resolveI18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import type { ContentLocale } from '../../common/i18n/locales.js';
import { articleMediaIds, parseArticleHtml } from '../../common/rich-text/article-html.js';
import { FrontPageService } from './front-page.service.js';
import { MediaService } from './media.service.js';

export const PUBLIC_PAGE_SIZE = 12;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
type Localized = Partial<Record<ContentLocale, string>>;

interface CardRow {
  id: string; title: Localized; subtitle: Localized; slug: Localized; locales: ContentLocale[]; published_at: Date; updated_at: Date;
  reading_minutes: Partial<Record<ContentLocale, number>>; breaking: boolean; featured: boolean; author_id: string | null; author_name: string | null;
  category_id: string | null; category_name: I18nString | null; category_slug: Localized | null; category_color: string | null;
  cover_media_id: string | null; cover_width: number | null; cover_height: number | null; cover_color: string | null; cover_alt: I18nString | null;
  cover_source: 'upload' | 'ai' | null; total?: number;
}

const CARD_COLUMNS = `n.id, n.title, n.subtitle, n.slug, n.locales, n.published_at, n.updated_at, n.reading_minutes, n.breaking, n.featured,
  n.author_id, a.name AS author_name, n.category_id, c.name AS category_name, c.slug AS category_slug, c.color AS category_color,
  n.cover_media_id, m.width AS cover_width, m.height AS cover_height, m.color AS cover_color, m.alt AS cover_alt, m.source AS cover_source`;
const CARD_JOINS = `FROM public.news n LEFT JOIN public.users a ON a.id = n.author_id LEFT JOIN public.categories c ON c.id = n.category_id
  LEFT JOIN public.media m ON m.id = n.cover_media_id`;
/** Published in the page's language: the only items a page of that language ever lists. */
const LIVE = (locale: string) => `n.status = 'published' AND n.published_at <= now() AND n.locales @> ARRAY[${locale}]::text[]`;

/**
 * What the site reads: published news only, each in the language of the page (an item not published in that language
 * does not exist there). Answers are plain data for server rendering; the reader is never identified.
 */
@Injectable()
export class PublicNewsService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(FrontPageService) private readonly frontPage: FrontPageService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  card(row: CardRow, locale: ContentLocale) {
    return {
      id: row.id, title: row.title[locale] ?? '', subtitle: row.subtitle[locale] ?? '', slug: row.slug[locale] ?? '', slugs: row.slug,
      publishedAt: row.published_at.toISOString(), updatedAt: row.updated_at.toISOString(), readingMinutes: row.reading_minutes[locale] ?? 1,
      breaking: row.breaking, featured: row.featured, author: row.author_id ? { id: row.author_id, name: row.author_name ?? '' } : null,
      category: row.category_id ? { id: row.category_id, name: resolveI18nString(row.category_name, locale), slug: row.category_slug?.[locale] ?? '', color: row.category_color ?? 'gray' } : null,
      cover: row.cover_media_id ? {
        id: row.cover_media_id, width: row.cover_width!, height: row.cover_height!, color: row.cover_color!, alt: resolveI18nString(row.cover_alt, locale), source: row.cover_source!,
      } : null,
    };
  }

  private async cards(where: string, parameters: unknown[], locale: ContentLocale, options: { limit: number; offset?: number; order?: string }) {
    const rows: CardRow[] = await this.database.query(`SELECT ${CARD_COLUMNS}, count(*) OVER ()::int AS total ${CARD_JOINS}
      WHERE ${LIVE('$1')} ${where ? `AND ${where}` : ''} ORDER BY ${options.order ?? 'n.published_at DESC, n.id'} LIMIT ${options.limit} OFFSET ${options.offset ?? 0}`,
    [locale, ...parameters]);
    return { items: rows.map((row) => this.card(row, locale)), total: rows[0]?.total ?? 0 };
  }

  /**
   * The home page: the editors' headline and highlights (else the newest featured, then the newest items), the
   * breaking items, the newest list, the blocks of the chosen sections and the most read of the week.
   */
  async home(locale: ContentLocale) {
    const page = await this.frontPage.current();
    const pinned = [page.headline, ...page.highlights].filter((id): id is string => !!id);
    const pinnedRows = pinned.length ? (await this.cards('n.id = ANY($2::uuid[])', [pinned], locale, { limit: 10 })).items : [];
    const byId = new Map(pinnedRows.map((item) => [item.id, item]));
    const used = new Set<string>();
    const take = (item: ReturnType<PublicNewsService['card']> | undefined) => { if (item) used.add(item.id); return item; };
    let headline = take(page.headline ? byId.get(page.headline) : undefined);
    const highlights = page.highlights.map((id) => byId.get(id)).filter((item) => !!item).map((item) => take(item)!);
    const featured = (await this.cards('n.featured', [], locale, { limit: 12 })).items;
    const latest = (await this.cards('', [], locale, { limit: 30 })).items;
    for (const candidate of [...featured, ...latest]) {
      if (!headline && !used.has(candidate.id)) headline = take(candidate);
      else if (highlights.length < 4 && !used.has(candidate.id)) highlights.push(take(candidate)!);
      if (headline && highlights.length >= 4) break;
    }
    const sectionIds = page.sections.length ? page.sections
      : (await this.database.query('SELECT id FROM public.categories WHERE active ORDER BY position LIMIT 4') as Array<{ id: string }>).map((row) => row.id);
    const sections = [];
    for (const id of sectionIds) {
      const [category]: Array<{ id: string; name: I18nString; slug: Localized; color: string; active: boolean }> = await this.database.query(
        'SELECT id, name, slug, color, active FROM public.categories WHERE id = $1', [id]);
      if (!category?.active) continue;
      const items = (await this.cards('n.category_id = $2', [id], locale, { limit: 5 })).items;
      if (items.length) sections.push({ category: { id, name: resolveI18nString(category.name, locale), slug: category.slug[locale] ?? '', color: category.color }, items });
    }
    return {
      headline: headline ?? null, highlights,
      breaking: (await this.cards(`n.breaking AND n.published_at > now() - interval '2 days'`, [], locale, { limit: 3 })).items,
      latest: latest.filter((item) => !used.has(item.id)).slice(0, 10), sections, mostRead: await this.mostRead(locale, 5),
    };
  }

  async mostRead(locale: ContentLocale, limit: number) {
    const rows: CardRow[] = await this.database.query(`SELECT ${CARD_COLUMNS} ${CARD_JOINS}
      JOIN (SELECT news_id, sum(views)::int AS week FROM public.news_views WHERE day > current_date - 7 GROUP BY news_id) v ON v.news_id = n.id
      WHERE ${LIVE('$1')} ORDER BY v.week DESC, n.published_at DESC LIMIT ${limit}`, [locale]);
    return rows.map((row) => this.card(row, locale));
  }

  /** A paginated list: the newest, a section's, a tag's, an author's or a search's. */
  async list(locale: ContentLocale, query: { page?: number; category?: string; tag?: string; author?: string; q?: string }) {
    const page = Math.max(1, Math.min(500, query.page ?? 1));
    const conditions: string[] = [];
    const parameters: unknown[] = [];
    const parameter = (value: unknown) => { parameters.push(value); return `$${parameters.length + 1}`; };
    let order: string | undefined;
    if (query.category) conditions.push(`c.slug ->> $1 = ${parameter(query.category)}`);
    if (query.tag) conditions.push(`EXISTS (SELECT 1 FROM public.news_tags nt JOIN public.tags t ON t.id = nt.tag_id WHERE nt.news_id = n.id AND t.slug ->> $1 = ${parameter(query.tag)})`);
    if (query.author) conditions.push(`n.author_id = ${parameter(query.author)}::uuid`);
    if (query.q?.trim()) {
      const text = query.q.trim().slice(0, 200);
      const config = locale === 'pt' ? 'public.pmn_pt' : 'public.pmn_en';
      const tsquery = `websearch_to_tsquery('${config}'::regconfig, ${parameter(text)})`;
      const like = parameter(`%${escapeLike(text)}%`);
      conditions.push(`(n.search_${locale} @@ ${tsquery} OR public.pmn_fold(n.title ->> $1) LIKE public.pmn_fold(${like}))`);
      order = `ts_rank(n.search_${locale}, ${tsquery}) DESC, n.published_at DESC, n.id`;
    }
    const result = await this.cards(conditions.join(' AND '), parameters, locale, { limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE, order });
    return { ...result, page, pageSize: PUBLIC_PAGE_SIZE };
  }

  /** One article by its address in a language, with everything its page shows. */
  async article(locale: ContentLocale, slug: string) {
    const [row]: Array<CardRow & { body: Localized; cover_caption: Localized; seo_title: Localized; seo_description: Localized;
      cover_caption_media: I18nString | null; cover_credit: string | null; author_bio: I18nString | null; author_job: I18nString | null;
      author_avatar: Date | null; ai_assisted: boolean }> = await this.database.query(`SELECT ${CARD_COLUMNS}, n.body, n.cover_caption, n.seo_title,
        n.seo_description, n.ai_assisted, m.caption AS cover_caption_media, m.credit AS cover_credit, a.bio AS author_bio, a.job_title AS author_job,
        a.avatar_updated_at AS author_avatar
      ${CARD_JOINS} WHERE ${LIVE('$1')} AND n.slug ->> $1 = $2`, [locale, slug]);
    if (!row) throw new NotFoundException();
    const body = row.body[locale] ?? '';
    const blocks = parseArticleHtml(body) ?? [];
    const tags: Array<{ name: I18nString; slug: Localized }> = await this.database.query(`SELECT t.name, t.slug FROM public.news_tags nt
      JOIN public.tags t ON t.id = nt.tag_id WHERE nt.news_id = $1 ORDER BY nt.position`, [row.id]);
    const related = row.category_id ? (await this.cards('n.category_id = $2 AND n.id <> $3', [row.category_id, row.id], locale, { limit: 4 })).items : [];
    const card = this.card(row, locale);
    return {
      ...card, body, aiAssisted: row.ai_assisted,
      cover: card.cover ? { ...card.cover, caption: row.cover_caption[locale] || resolveI18nString(row.cover_caption_media, locale), credit: row.cover_credit ?? '' } : null,
      seo: { title: row.seo_title[locale] || card.title, description: row.seo_description[locale] || card.subtitle },
      author: card.author ? { ...card.author, jobTitle: resolveI18nString(row.author_job, locale), bio: resolveI18nString(row.author_bio, locale), avatar: row.author_avatar?.toISOString() ?? null } : null,
      tags: tags.map((tag) => ({ name: resolveI18nString(tag.name, locale), slug: tag.slug[locale] ?? '' })),
      media: (await this.media.describe(articleMediaIds(blocks))).map((item) => ({ ...item, alt: resolveI18nString(item.alt, locale), caption: resolveI18nString(item.caption, locale) })),
      related, alternates: Object.fromEntries(row.locales.flatMap((other) => row.slug[other] ? [[other, row.slug[other]]] : [])),
    };
  }

  /** Counts one read of a published item, per day, without any trace of the reader. */
  async view(id: string): Promise<void> {
    await this.database.transaction(async (manager) => {
      const [, updated]: [unknown, number] = await manager.query(`UPDATE public.news SET views = views + 1 WHERE id = $1 AND status = 'published'`, [id]);
      if (!updated) throw new NotFoundException();
      await manager.query(`INSERT INTO public.news_views (news_id, day, views) VALUES ($1, current_date, 1)
        ON CONFLICT (news_id, day) DO UPDATE SET views = public.news_views.views + 1`, [id]);
    });
  }

  async category(locale: ContentLocale, slug: string) {
    const [row]: Array<{ id: string; name: I18nString; description: I18nString; slug: Localized; color: string }> = await this.database.query(
      'SELECT id, name, description, slug, color FROM public.categories WHERE active AND slug ->> $1 = $2', [locale, slug]);
    if (!row) throw new NotFoundException();
    return { id: row.id, name: resolveI18nString(row.name, locale), description: resolveI18nString(row.description, locale), slug: row.slug[locale], slugs: row.slug, color: row.color };
  }

  async tag(locale: ContentLocale, slug: string) {
    const [row]: Array<{ id: string; name: I18nString; slug: Localized }> = await this.database.query('SELECT id, name, slug FROM public.tags WHERE slug ->> $1 = $2', [locale, slug]);
    if (!row) throw new NotFoundException();
    return { id: row.id, name: resolveI18nString(row.name, locale), slug: row.slug[locale], slugs: row.slug };
  }

  /** An author of published news, for the byline's page. */
  async author(locale: ContentLocale, id: string) {
    const [row]: Array<{ id: string; name: string; bio: I18nString; job_title: I18nString; avatar_updated_at: Date | null }> = await this.database.query(`
      SELECT u.id, u.name, u.bio, u.job_title, u.avatar_updated_at FROM public.users u
      WHERE u.id = $1 AND EXISTS (SELECT 1 FROM public.news n WHERE n.author_id = u.id AND n.status = 'published')`, [id]);
    if (!row) throw new NotFoundException();
    return { id: row.id, name: row.name, bio: resolveI18nString(row.bio, locale), jobTitle: resolveI18nString(row.job_title, locale), avatar: row.avatar_updated_at?.toISOString() ?? null };
  }

  /** The newest items with their summary, for the RSS feed. */
  async feed(locale: ContentLocale) {
    return (await this.cards('', [], locale, { limit: 30 })).items;
  }

  /** Every published address, for the sitemap. */
  async sitemap() {
    const news: Array<{ slug: Localized; locales: ContentLocale[]; updated_at: Date; published_at: Date }> = await this.database.query(`
      SELECT slug, locales, updated_at, published_at FROM public.news WHERE status = 'published' AND published_at <= now() ORDER BY published_at DESC LIMIT 50000`);
    const categories: Array<{ slug: Localized }> = await this.database.query('SELECT slug FROM public.categories WHERE active');
    return {
      news: news.map((row) => ({ slugs: Object.fromEntries(row.locales.flatMap((locale) => row.slug[locale] ? [[locale, row.slug[locale]]] : [])), updatedAt: row.updated_at.toISOString(), publishedAt: row.published_at.toISOString() })),
      categories: categories.map((row) => ({ slugs: row.slug })),
    };
  }
}
