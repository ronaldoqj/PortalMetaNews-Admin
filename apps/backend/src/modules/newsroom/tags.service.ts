import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { i18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import { CONTENT_LOCALES } from '../../common/i18n/locales.js';
import { SLUG, slugify, uniqueSlug } from './slug.js';

export const TAG_PAGE_SIZE = 50;
interface TagRow { id: string; name: I18nString; slug: { pt: string; en: string }; created_at: Date; news?: number; total?: number }
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** The free subjects news are tagged with, in both languages. */
@Injectable()
export class TagsService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async list(actor: Actor, query: { search?: string; page?: number }) {
    requirePermission(actor);
    const page = Math.max(1, query.page ?? 1);
    const parameters: unknown[] = [];
    let where = '';
    if (query.search?.trim()) {
      parameters.push(`%${escapeLike(query.search.trim())}%`);
      where = `WHERE public.pmn_fold(coalesce(t.name ->> 'pt', '') || ' ' || coalesce(t.name ->> 'en', '')) LIKE public.pmn_fold($1)`;
    }
    const rows: TagRow[] = await this.database.query(`SELECT t.*, (SELECT count(*)::int FROM public.news_tags nt WHERE nt.tag_id = t.id) AS news,
      count(*) OVER ()::int AS total FROM public.tags t ${where}
      ORDER BY coalesce(t.name ->> 'pt', t.name ->> 'en'), t.id LIMIT ${TAG_PAGE_SIZE} OFFSET ${(page - 1) * TAG_PAGE_SIZE}`, parameters);
    return { items: rows.map((row) => this.view(row)), total: rows[0]?.total ?? 0, page, pageSize: TAG_PAGE_SIZE };
  }

  async create(actor: Actor, input: { name: unknown; slug?: { pt?: string; en?: string } }) {
    requirePermission(actor, 'taxonomy:manage', 'news:write');
    return this.database.transaction(async (manager) => {
      const tag = await this.insert(manager, i18nString(input.name, { maxLength: 60, required: true }), input.slug);
      await audit(manager, { actorId: actor.userId, action: 'tag.created', resourceType: 'tag', resourceId: tag.id });
      return tag;
    });
  }

  async update(actor: Actor, id: string, input: { name?: unknown; slug?: { pt?: string; en?: string } }) {
    requirePermission(actor, 'taxonomy:manage');
    return this.database.transaction(async (manager) => {
      const [current]: TagRow[] = await manager.query('SELECT * FROM public.tags WHERE id = $1 FOR UPDATE', [id]);
      if (!current) throw new NotFoundException();
      const name = input.name === undefined ? current.name : i18nString(input.name, { maxLength: 60, required: true });
      const slug = input.slug ? await this.slugs(manager, name, input.slug, id) : current.slug;
      await manager.query('UPDATE public.tags SET name = $2::jsonb, slug = $3::jsonb WHERE id = $1', [id, JSON.stringify(name), JSON.stringify(slug)]);
      await audit(manager, { actorId: actor.userId, action: 'tag.updated', resourceType: 'tag', resourceId: id });
      return this.view({ ...current, name, slug });
    });
  }

  async remove(actor: Actor, id: string) {
    requirePermission(actor, 'taxonomy:manage');
    await this.database.transaction(async (manager) => {
      const [, removed]: [unknown, number] = await manager.query('DELETE FROM public.tags WHERE id = $1', [id]);
      if (!removed) throw new NotFoundException();
      await audit(manager, { actorId: actor.userId, action: 'tag.deleted', resourceType: 'tag', resourceId: id });
    });
  }

  /** The ids of tags named as given, creating the missing ones (the AI writer's suggestions become real tags). */
  async ensure(manager: EntityManager, names: ReadonlyArray<I18nString>): Promise<string[]> {
    const ids: string[] = [];
    for (const raw of names.slice(0, 10)) {
      const name = i18nString(raw, { maxLength: 60, required: true });
      const slugPt = slugify(name.pt ?? name.en ?? '');
      if (!slugPt) continue;
      const [existing]: Array<{ id: string }> = await manager.query(`SELECT id FROM public.tags WHERE slug ->> 'pt' = $1
        OR public.pmn_fold(name ->> 'pt') = public.pmn_fold($2) LIMIT 1`, [slugPt, name.pt ?? name.en ?? '']);
      ids.push(existing?.id ?? (await this.insert(manager, name, undefined)).id);
    }
    return [...new Set(ids)];
  }

  private async insert(manager: EntityManager, name: I18nString, wanted: { pt?: string; en?: string } | undefined) {
    const id = randomUUID();
    const slug = await this.slugs(manager, name, wanted, null);
    const [row]: TagRow[] = await manager.query('INSERT INTO public.tags (id, name, slug) VALUES ($1, $2::jsonb, $3::jsonb) RETURNING *',
      [id, JSON.stringify(name), JSON.stringify(slug)]);
    return this.view(row);
  }

  private async slugs(manager: EntityManager, name: I18nString, wanted: { pt?: string; en?: string } | undefined, id: string | null) {
    const result: Record<string, string> = {};
    for (const locale of CONTENT_LOCALES) {
      const given = wanted?.[locale]?.trim();
      if (given && !SLUG.test(given)) throw new BadRequestException({ statusCode: 400, message: 'Invalid slug', code: 'slug_invalid' });
      result[locale] = await uniqueSlug(manager, 'tags', locale, given || slugify(name[locale] ?? name.pt ?? name.en ?? ''), id);
    }
    return result as { pt: string; en: string };
  }

  view(row: TagRow) {
    return { id: row.id, name: row.name, slug: row.slug, ...(row.news !== undefined ? { news: row.news } : {}) };
  }
}
