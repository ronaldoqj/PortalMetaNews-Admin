import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { hasPermission, requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { i18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import { CONTENT_LOCALES, isContentLocale, type ContentLocale } from '../../common/i18n/locales.js';
import { canonicalArticleHtml, readingMinutes } from '../../common/rich-text/article-html.js';
import { MediaService } from './media.service.js';
import { SLUG, slugify, uniqueSlug } from './slug.js';

export const NEWS_STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived'] as const;
export type NewsStatus = typeof NEWS_STATUSES[number];
export const NEWS_ACTIONS = ['submit', 'return', 'publish', 'schedule', 'unpublish', 'archive', 'restore'] as const;
export type NewsAction = typeof NEWS_ACTIONS[number];
export const NEWS_PAGE_SIZE = 20;
export const NEWS_LIMITS = { title: 200, subtitle: 400, caption: 500, seoTitle: 70, seoDescription: 170, tags: 15 } as const;
/** Snapshots kept per news item; older ones are dropped as new ones arrive. */
const REVISIONS_KEPT = 50;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

type Localized = Partial<Record<ContentLocale, string>>;
export interface TranslationState { enabled: boolean; source: ContentLocale }

export interface NewsRow {
  id: string; status: NewsStatus; title: Localized; subtitle: Localized; body: Localized; body_text: Localized; slug: Localized;
  category_id: string | null; cover_media_id: string | null; cover_caption: Localized; author_id: string | null; locales: ContentLocale[];
  featured: boolean; breaking: boolean; seo_title: Localized; seo_description: Localized; translation: TranslationState; ai_assisted: boolean;
  reading_minutes: Partial<Record<ContentLocale, number>>; views: string; published_at: Date | null; scheduled_at: Date | null;
  created_by: string | null; updated_by: string | null; created_at: Date; updated_at: Date;
  author_name?: string | null; created_by_name?: string | null; updated_by_name?: string | null; total?: number;
}

export interface NewsInput {
  title?: unknown; subtitle?: unknown; body?: unknown; slug?: unknown; categoryId?: string | null; coverMediaId?: string | null;
  coverCaption?: unknown; authorId?: string | null; tagIds?: string[]; locales?: string[]; featured?: boolean; breaking?: boolean;
  seoTitle?: unknown; seoDescription?: unknown; translation?: TranslationState; aiAssisted?: boolean;
  /** Optimistic concurrency: the `updatedAt` the editor loaded; a newer save by someone else answers 409. */
  expectedUpdatedAt?: string;
}

export interface NewsQuery {
  status?: NewsStatus; categoryId?: string; authorId?: string; search?: string; mine?: boolean; page?: number;
  sort?: 'updated' | 'published' | 'views';
}

const fail = (code: string, message: string, extra: Record<string, unknown> = {}) =>
  new BadRequestException({ statusCode: 400, message, code, ...extra });

/**
 * The newsroom's news: the builder's bilingual content, the editorial workflow (draft → review → scheduled or published →
 * archived) and the history of each item. Reporters (`news:write`) edit their own items until they are published;
 * reviewers and editors (`news:edit_all`) edit any; only `news:publish` publishes, schedules or takes an item down.
 */
@Injectable()
export class NewsService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async list(actor: Actor, query: NewsQuery) {
    requirePermission(actor, 'news:read');
    const page = Math.max(1, query.page ?? 1);
    const conditions: string[] = [];
    const parameters: unknown[] = [];
    const parameter = (value: unknown) => { parameters.push(value); return `$${parameters.length}`; };
    if (query.status) conditions.push(`n.status = ${parameter(query.status)}`);
    if (query.categoryId) conditions.push(`n.category_id = ${parameter(query.categoryId)}`);
    if (query.authorId) conditions.push(`n.author_id = ${parameter(query.authorId)}`);
    if (query.mine) conditions.push(`(n.author_id = ${parameter(actor.userId)} OR n.created_by = $${parameters.length})`);
    if (query.search?.trim()) {
      const term = parameter(`%${escapeLike(query.search.trim())}%`);
      conditions.push(`public.pmn_fold(coalesce(n.title ->> 'pt', '') || ' ' || coalesce(n.title ->> 'en', '')) LIKE public.pmn_fold(${term})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = query.sort === 'published' ? 'n.published_at DESC NULLS LAST' : query.sort === 'views' ? 'n.views DESC' : 'n.updated_at DESC';
    const rows: Array<NewsRow & { category_name: I18nString | null; category_color: string | null; cover_color: string | null }> = await this.database.query(`
      SELECT n.*, a.name AS author_name, c.name AS category_name, c.color AS category_color, m.color AS cover_color, count(*) OVER ()::int AS total
      FROM public.news n LEFT JOIN public.users a ON a.id = n.author_id LEFT JOIN public.categories c ON c.id = n.category_id
      LEFT JOIN public.media m ON m.id = n.cover_media_id
      ${where} ORDER BY ${order}, n.id LIMIT ${NEWS_PAGE_SIZE} OFFSET ${(page - 1) * NEWS_PAGE_SIZE}`, parameters);
    const counts: Array<{ status: NewsStatus; count: number }> = await this.database.query('SELECT status, count(*)::int AS count FROM public.news GROUP BY status');
    return {
      items: rows.map((row) => ({
        id: row.id, status: row.status, title: row.title, locales: row.locales, featured: row.featured, breaking: row.breaking,
        author: row.author_id ? { id: row.author_id, name: row.author_name ?? '' } : null,
        category: row.category_id ? { id: row.category_id, name: row.category_name ?? {}, color: row.category_color ?? 'gray' } : null,
        coverMediaId: row.cover_media_id, coverColor: row.cover_color, views: Number(row.views), publishedAt: row.published_at?.toISOString() ?? null,
        scheduledAt: row.scheduled_at?.toISOString() ?? null, updatedAt: row.updated_at.toISOString(), aiAssisted: row.ai_assisted,
        permissions: this.permissions(actor, row),
      })),
      total: rows[0]?.total ?? 0, page, pageSize: NEWS_PAGE_SIZE,
      counts: Object.fromEntries(NEWS_STATUSES.map((status) => [status, counts.find((count) => count.status === status)?.count ?? 0])),
    };
  }

  async get(actor: Actor, id: string) {
    requirePermission(actor, 'news:read');
    return this.view(this.database.manager, actor, await this.row(this.database.manager, id));
  }

  /** A new draft, by the signed-in account; content may come with it (a copy, the AI writer's proposal). */
  async create(actor: Actor, input: NewsInput = {}, manager?: EntityManager) {
    requirePermission(actor, 'news:write');
    const run = async (transaction: EntityManager) => {
      const id = randomUUID();
      const [{ default_locale }]: Array<{ default_locale: ContentLocale }> = await transaction.query('SELECT default_locale FROM public.settings WHERE singleton');
      await transaction.query(`INSERT INTO public.news (id, author_id, created_by, updated_by, translation) VALUES ($1, $2, $2, $2, $3::jsonb)`,
        [id, actor.userId, JSON.stringify({ enabled: true, source: default_locale })]);
      await audit(transaction, { actorId: actor.userId, action: 'news.created', resourceType: 'news', resourceId: id });
      if (Object.keys(input).length) await this.apply(transaction, actor, id, input, 'save');
      return this.view(transaction, actor, await this.row(transaction, id));
    };
    return manager ? run(manager) : this.database.transaction(run);
  }

  async update(actor: Actor, id: string, input: NewsInput) {
    requirePermission(actor, 'news:write', 'news:edit_all');
    return this.database.transaction(async (manager) => {
      await this.apply(manager, actor, id, input, 'save');
      return this.view(manager, actor, await this.row(manager, id));
    });
  }

  /** Validates and writes the changes, keeping a snapshot when the content changed. */
  private async apply(manager: EntityManager, actor: Actor, id: string, input: NewsInput, reason: 'save' | 'restore' | 'ai') {
    const current = await this.row(manager, id, true);
    if (!this.permissions(actor, current).edit) throw new ForbiddenException();
    if (input.expectedUpdatedAt && new Date(input.expectedUpdatedAt).getTime() !== current.updated_at.getTime()) {
      throw new ConflictException({ statusCode: 409, message: 'The item was changed by someone else', code: 'news_conflict', updatedAt: current.updated_at.toISOString() });
    }
    const title = input.title === undefined ? current.title : i18nString(input.title, { maxLength: NEWS_LIMITS.title, required: false });
    const body: Localized = { ...current.body };
    const bodyText: Localized = { ...current.body_text };
    if (input.body !== undefined) {
      if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) throw fail('body_invalid', 'Invalid body');
      for (const [locale, html] of Object.entries(input.body as Record<string, unknown>)) {
        if (!isContentLocale(locale) || typeof html !== 'string') throw fail('body_invalid', 'Invalid body');
        const canonical = canonicalArticleHtml(html);
        if (!canonical) throw fail('body_invalid', 'Invalid body', { locale });
        if (canonical.html) { body[locale] = canonical.html; bodyText[locale] = canonical.text; } else { delete body[locale]; delete bodyText[locale]; }
      }
    }
    const slug = await this.slugs(manager, id, title, current.slug, input.slug, current.status === 'published' || current.status === 'scheduled');
    const locales = input.locales === undefined ? current.locales : this.locales(input.locales);
    const translation = input.translation === undefined ? current.translation : this.translation(input.translation);
    const next = {
      title, subtitle: input.subtitle === undefined ? current.subtitle : i18nString(input.subtitle, { maxLength: NEWS_LIMITS.subtitle, required: false }),
      body, bodyText, slug,
      categoryId: input.categoryId === undefined ? current.category_id : await this.reference(manager, 'categories', input.categoryId),
      coverMediaId: input.coverMediaId === undefined ? current.cover_media_id : await this.reference(manager, 'media', input.coverMediaId),
      coverCaption: input.coverCaption === undefined ? current.cover_caption : i18nString(input.coverCaption, { maxLength: NEWS_LIMITS.caption, required: false }),
      authorId: input.authorId === undefined ? current.author_id : await this.author(manager, actor, current, input.authorId),
      locales, featured: input.featured ?? current.featured, breaking: input.breaking ?? current.breaking,
      seoTitle: input.seoTitle === undefined ? current.seo_title : i18nString(input.seoTitle, { maxLength: NEWS_LIMITS.seoTitle, required: false }),
      seoDescription: input.seoDescription === undefined ? current.seo_description : i18nString(input.seoDescription, { maxLength: NEWS_LIMITS.seoDescription, required: false }),
      translation, aiAssisted: input.aiAssisted ?? current.ai_assisted,
    };
    // A live item must stay publishable in every language it is published in.
    if (current.status === 'published' || current.status === 'scheduled') this.assertPublishable({ ...current, ...this.columns(next) });
    const minutes = Object.fromEntries(CONTENT_LOCALES.flatMap((locale) => next.bodyText[locale] ? [[locale, readingMinutes(next.bodyText[locale]!)]] : []));
    await manager.query(`UPDATE public.news SET title = $2::jsonb, subtitle = $3::jsonb, body = $4::jsonb, body_text = $5::jsonb, slug = $6::jsonb,
        category_id = $7, cover_media_id = $8, cover_caption = $9::jsonb, author_id = $10, locales = $11, featured = $12, breaking = $13,
        seo_title = $14::jsonb, seo_description = $15::jsonb, translation = $16::jsonb, ai_assisted = $17, reading_minutes = $18::jsonb,
        updated_by = $19, updated_at = now() WHERE id = $1`, [
      id, JSON.stringify(next.title), JSON.stringify(next.subtitle), JSON.stringify(next.body), JSON.stringify(next.bodyText), JSON.stringify(next.slug),
      next.categoryId, next.coverMediaId, JSON.stringify(next.coverCaption), next.authorId, next.locales, next.featured, next.breaking,
      JSON.stringify(next.seoTitle), JSON.stringify(next.seoDescription), JSON.stringify(next.translation), next.aiAssisted, JSON.stringify(minutes), actor.userId,
    ]);
    if (input.tagIds !== undefined) await this.tags(manager, id, input.tagIds);
    const before = await this.snapshotOf(manager, current);
    const after = await this.snapshotOf(manager, await this.row(manager, id));
    if (JSON.stringify(before) !== JSON.stringify(after)) await this.recordRevision(manager, actor, id, after, reason);
  }

  /** The editorial workflow. Every move is audited with the status it left and the one it reached. */
  async transition(actor: Actor, id: string, action: NewsAction, scheduledAt?: string) {
    requirePermission(actor, 'news:read');
    return this.database.transaction(async (manager) => {
      const row = await this.row(manager, id, true);
      const allowed = this.permissions(actor, row);
      const publishing = ['publish', 'schedule', 'unpublish', 'archive'].includes(action);
      if (publishing ? !allowed.publish : !(allowed.edit || allowed.publish)) throw new ForbiddenException();
      const from = row.status;
      const moves: Record<NewsAction, readonly NewsStatus[]> = {
        submit: ['draft'], return: ['review'], publish: ['draft', 'review', 'scheduled', 'archived'], schedule: ['draft', 'review', 'scheduled'],
        unpublish: ['published', 'scheduled'], archive: ['published'], restore: ['archived'],
      };
      if (!moves[action].includes(from)) throw new ConflictException({ statusCode: 409, message: 'Not allowed from the current status', code: 'news_status_invalid', status: from });
      let to: NewsStatus;
      switch (action) {
        case 'submit': to = 'review'; break;
        case 'return': case 'unpublish': case 'restore': to = 'draft'; break;
        case 'archive': to = 'archived'; break;
        case 'publish': this.assertPublishable(row); to = 'published'; break;
        case 'schedule': {
          this.assertPublishable(row);
          const when = scheduledAt ? new Date(scheduledAt) : null;
          if (!when || Number.isNaN(when.getTime()) || when.getTime() <= Date.now() + 30_000) throw fail('schedule_invalid', 'The schedule must be in the future');
          await manager.query(`UPDATE public.news SET status = 'scheduled', scheduled_at = $2, updated_by = $3, updated_at = now() WHERE id = $1`, [id, when, actor.userId]);
          await audit(manager, { actorId: actor.userId, action: 'news.scheduled', resourceType: 'news', resourceId: id, metadata: { from, at: when.toISOString() } });
          return this.view(manager, actor, await this.row(manager, id));
        }
      }
      await manager.query(`UPDATE public.news SET status = $2,
          published_at = CASE WHEN $2 = 'published' THEN CASE WHEN status = 'archived' THEN published_at ELSE coalesce(published_at, now()) END ELSE published_at END,
          scheduled_at = NULL, updated_by = $3, updated_at = now() WHERE id = $1`, [id, to, actor.userId]);
      await audit(manager, { actorId: actor.userId, action: `news.${action === 'publish' ? 'published' : action === 'submit' ? 'submitted' : action === 'return' ? 'returned' : action === 'unpublish' ? 'unpublished' : action === 'archive' ? 'archived' : 'restored'}`, resourceType: 'news', resourceId: id, metadata: { from, to } });
      return this.view(manager, actor, await this.row(manager, id));
    });
  }

  async remove(actor: Actor, id: string) {
    requirePermission(actor, 'news:delete');
    await this.database.transaction(async (manager) => {
      const row = await this.row(manager, id, true);
      if (row.status === 'published') throw new ConflictException({ statusCode: 409, message: 'Unpublish or archive before deleting', code: 'news_published' });
      await manager.query('DELETE FROM public.news WHERE id = $1', [id]);
      await audit(manager, { actorId: actor.userId, action: 'news.deleted', resourceType: 'news', resourceId: id, metadata: { status: row.status } });
    });
  }

  async revisions(actor: Actor, id: string) {
    requirePermission(actor, 'news:read');
    await this.row(this.database.manager, id);
    const rows: Array<{ id: string; reason: string; created_at: Date; created_by_name: string | null; title: Localized }> = await this.database.query(`
      SELECT r.id, r.reason, r.created_at, u.name AS created_by_name, r.snapshot -> 'title' AS title
      FROM public.news_revisions r LEFT JOIN public.users u ON u.id = r.created_by WHERE r.news_id = $1 ORDER BY r.created_at DESC, r.id`, [id]);
    return rows.map((row) => ({ id: row.id, reason: row.reason, createdAt: row.created_at.toISOString(), createdBy: row.created_by_name, title: row.title ?? {} }));
  }

  async revision(actor: Actor, id: string, revisionId: string) {
    requirePermission(actor, 'news:read');
    const [row]: Array<{ snapshot: Record<string, unknown>; created_at: Date }> = await this.database.query(
      'SELECT snapshot, created_at FROM public.news_revisions WHERE id = $1 AND news_id = $2', [revisionId, id]);
    if (!row) throw new NotFoundException();
    return { id: revisionId, createdAt: row.created_at.toISOString(), snapshot: row.snapshot };
  }

  /** Puts a snapshot back as the current content (a new snapshot records the restore). The status never changes. */
  async restoreRevision(actor: Actor, id: string, revisionId: string) {
    requirePermission(actor, 'news:write', 'news:edit_all');
    return this.database.transaction(async (manager) => {
      const [row]: Array<{ snapshot: Record<string, unknown> }> = await manager.query('SELECT snapshot FROM public.news_revisions WHERE id = $1 AND news_id = $2', [revisionId, id]);
      if (!row) throw new NotFoundException();
      const { tags: _tags, ...snapshot } = row.snapshot as NewsInput & { tags?: unknown };
      await this.apply(manager, actor, id, snapshot, 'restore');
      await audit(manager, { actorId: actor.userId, action: 'news.revision_restored', resourceType: 'news', resourceId: id, metadata: { revisionId } });
      return this.view(manager, actor, await this.row(manager, id));
    });
  }

  /** Publishes what is due; run by the scheduler every half minute. Answers how many went live. */
  async publishDue(): Promise<number> {
    return this.database.transaction(async (manager) => {
      const [rows]: [Array<{ id: string }>, number] = await manager.query(`UPDATE public.news SET status = 'published', published_at = coalesce(published_at, scheduled_at),
        scheduled_at = NULL, updated_at = now() WHERE status = 'scheduled' AND scheduled_at <= now() RETURNING id`);
      for (const { id } of rows) await audit(manager, { actorId: null, action: 'news.published', resourceType: 'news', resourceId: id, metadata: { from: 'scheduled', to: 'published', scheduler: true } });
      return rows.length;
    });
  }

  permissions(actor: Actor, row: Pick<NewsRow, 'status' | 'author_id' | 'created_by'>) {
    const own = row.author_id === actor.userId || row.created_by === actor.userId;
    const edit = hasPermission(actor, 'news:edit_all') || (hasPermission(actor, 'news:write') && own && (row.status === 'draft' || row.status === 'review'));
    return { edit, publish: hasPermission(actor, 'news:publish'), delete: hasPermission(actor, 'news:delete') && row.status !== 'published' };
  }

  /** Every language it is published in has its title, body and address. */
  private assertPublishable(row: Pick<NewsRow, 'locales' | 'title' | 'body_text' | 'slug' | 'body'>) {
    if (!row.locales.length) throw fail('news_no_locale', 'Choose at least one language to publish in');
    const missing = row.locales.flatMap((locale) => [
      !row.title[locale]?.trim() && `${locale}.title`, !(row.body_text[locale]?.trim() || row.body[locale]) && `${locale}.body`, !row.slug[locale] && `${locale}.slug`,
    ].filter((field): field is string => !!field));
    if (missing.length) throw fail('news_incomplete', 'Missing content to publish', { missing });
  }

  private columns(next: { title: Localized; body: Localized; bodyText: Localized; slug: Localized; locales: ContentLocale[] }) {
    return { title: next.title, body: next.body, body_text: next.bodyText, slug: next.slug, locales: next.locales };
  }

  private locales(values: unknown[]): ContentLocale[] {
    if (!Array.isArray(values) || !values.every(isContentLocale)) throw fail('locales_invalid', 'Invalid languages');
    return CONTENT_LOCALES.filter((locale) => values.includes(locale));
  }

  private translation(value: TranslationState): TranslationState {
    if (!value || typeof value.enabled !== 'boolean' || !isContentLocale(value.source)) throw fail('translation_invalid', 'Invalid translation state');
    return { enabled: value.enabled, source: value.source };
  }

  /**
   * Each language's address: the one typed, else (while nothing is published) one from the title, kept unique.
   * A live item keeps its addresses unless the editor changes them on purpose, so shared links do not break.
   */
  private async slugs(manager: EntityManager, id: string, title: Localized, current: Localized, input: unknown, live: boolean): Promise<Localized> {
    const wanted = input === undefined ? {} : input;
    if (!wanted || typeof wanted !== 'object' || Array.isArray(wanted)) throw fail('slug_invalid', 'Invalid slug');
    const result: Localized = { ...current };
    for (const locale of CONTENT_LOCALES) {
      const typed = (wanted as Record<string, unknown>)[locale];
      if (typed !== undefined) {
        if (typed === '' || typed === null) { if (!live) delete result[locale]; continue; }
        if (typeof typed !== 'string' || !SLUG.test(typed) || typed.length > 120) throw fail('slug_invalid', 'Invalid slug', { locale });
        result[locale] = await uniqueSlug(manager, 'news', locale, typed, id);
      } else if (!result[locale] && title[locale]?.trim()) {
        const generated = slugify(title[locale]!);
        if (generated) result[locale] = await uniqueSlug(manager, 'news', locale, generated, id);
      } else if (result[locale] && !live && !title[locale]?.trim()) {
        delete result[locale];
      }
    }
    return result;
  }

  private async reference(manager: EntityManager, table: 'categories' | 'media', id: string | null): Promise<string | null> {
    if (id === null) return null;
    const [row]: unknown[] = await manager.query(`SELECT 1 FROM public.${table} WHERE id = $1`, [id]);
    if (!row) throw fail(`${table === 'media' ? 'media' : 'category'}_not_found`, 'Unknown reference');
    return id;
  }

  /** Reporters sign their own items; changing the byline to someone else needs `news:edit_all`. */
  private async author(manager: EntityManager, actor: Actor, current: NewsRow, authorId: string | null): Promise<string | null> {
    if (authorId === current.author_id) return authorId;
    if (!hasPermission(actor, 'news:edit_all') && authorId !== actor.userId) throw new ForbiddenException();
    if (authorId === null) return null;
    const [row]: unknown[] = await manager.query('SELECT 1 FROM public.users WHERE id = $1', [authorId]);
    if (!row) throw fail('author_not_found', 'Unknown author');
    return authorId;
  }

  private async tags(manager: EntityManager, id: string, tagIds: string[]) {
    const unique = [...new Set(tagIds)];
    if (unique.length > NEWS_LIMITS.tags) throw fail('tags_too_many', 'Too many tags');
    const found: Array<{ id: string }> = unique.length ? await manager.query('SELECT id FROM public.tags WHERE id = ANY($1::uuid[])', [unique]) : [];
    if (found.length !== unique.length) throw fail('tag_not_found', 'Unknown tag');
    await manager.query('DELETE FROM public.news_tags WHERE news_id = $1', [id]);
    for (const [position, tagId] of unique.entries()) {
      await manager.query('INSERT INTO public.news_tags (news_id, tag_id, position) VALUES ($1, $2, $3)', [id, tagId, position]);
    }
  }

  private async snapshotOf(manager: EntityManager, row: NewsRow) {
    const tags: Array<{ tag_id: string }> = await manager.query('SELECT tag_id FROM public.news_tags WHERE news_id = $1 ORDER BY position', [row.id]);
    return {
      title: row.title, subtitle: row.subtitle, body: row.body, slug: row.slug, categoryId: row.category_id, coverMediaId: row.cover_media_id,
      coverCaption: row.cover_caption, authorId: row.author_id, tagIds: tags.map((tag) => tag.tag_id), locales: row.locales, featured: row.featured,
      breaking: row.breaking, seoTitle: row.seo_title, seoDescription: row.seo_description,
    };
  }

  private async recordRevision(manager: EntityManager, actor: Actor, id: string, snapshot: Record<string, unknown>, reason: 'save' | 'restore' | 'ai' | 'status') {
    await manager.query('INSERT INTO public.news_revisions (id, news_id, snapshot, reason, created_by) VALUES ($1, $2, $3::jsonb, $4, $5)',
      [randomUUID(), id, JSON.stringify(snapshot), reason, actor.userId]);
    await manager.query(`DELETE FROM public.news_revisions WHERE news_id = $1 AND id NOT IN (
      SELECT id FROM public.news_revisions WHERE news_id = $1 ORDER BY created_at DESC, id LIMIT ${REVISIONS_KEPT})`, [id]);
  }

  async row(manager: EntityManager, id: string, lock = false): Promise<NewsRow> {
    const [row]: NewsRow[] = await manager.query(`SELECT n.*, a.name AS author_name, cu.name AS created_by_name, uu.name AS updated_by_name
      FROM public.news n LEFT JOIN public.users a ON a.id = n.author_id LEFT JOIN public.users cu ON cu.id = n.created_by
      LEFT JOIN public.users uu ON uu.id = n.updated_by WHERE n.id = $1 ${lock ? 'FOR UPDATE OF n' : ''}`, [id]);
    if (!row) throw new NotFoundException();
    return row;
  }

  /** What the builder edits: every field in both languages, the references resolved and what the account may do. */
  async view(manager: EntityManager, actor: Actor, row: NewsRow) {
    const tags: Array<{ id: string; name: I18nString; slug: Localized }> = await manager.query(`SELECT t.id, t.name, t.slug FROM public.news_tags nt
      JOIN public.tags t ON t.id = nt.tag_id WHERE nt.news_id = $1 ORDER BY nt.position`, [row.id]);
    const [category]: Array<{ id: string; name: I18nString; color: string; slug: Localized }> = row.category_id
      ? await manager.query('SELECT id, name, color, slug FROM public.categories WHERE id = $1', [row.category_id]) : [];
    const [cover] = row.cover_media_id ? await this.media.describe([row.cover_media_id], manager) : [];
    return {
      id: row.id, status: row.status, title: row.title, subtitle: row.subtitle, body: row.body, slug: row.slug,
      categoryId: row.category_id, category: category ?? null, coverMediaId: row.cover_media_id, cover: cover ?? null, coverCaption: row.cover_caption,
      authorId: row.author_id, author: row.author_id ? { id: row.author_id, name: row.author_name ?? '' } : null, tags,
      locales: row.locales, featured: row.featured, breaking: row.breaking, seoTitle: row.seo_title, seoDescription: row.seo_description,
      translation: row.translation, aiAssisted: row.ai_assisted, readingMinutes: row.reading_minutes, views: Number(row.views),
      publishedAt: row.published_at?.toISOString() ?? null, scheduledAt: row.scheduled_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
      createdBy: row.created_by_name ?? null, updatedBy: row.updated_by_name ?? null, permissions: this.permissions(actor, row),
    };
  }
}
