import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { i18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import { CONTENT_LOCALES } from '../../common/i18n/locales.js';
import { SLUG, slugify, uniqueSlug } from './slug.js';

/** The label colours an editoria may take: Mantine palette names, so they follow the theme's light and dark schemes. */
export const CATEGORY_COLORS = ['blue', 'indigo', 'violet', 'grape', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'gray'] as const;

export interface CategoryInput {
  name: unknown; slug?: { pt?: string; en?: string }; description?: unknown; color?: string; active?: boolean; showInMenu?: boolean;
}

interface CategoryRow {
  id: string; name: I18nString; slug: { pt: string; en: string }; description: I18nString; color: string; position: number; active: boolean;
  show_in_menu: boolean; news?: number;
}

/** The sections (editorias) news are filed under, in the order the menu shows them. */
@Injectable()
export class CategoriesService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  /** Every category with how many news items it holds; any account of the panel may read them. */
  async list(actor: Actor) {
    requirePermission(actor);
    const rows: CategoryRow[] = await this.database.query(`SELECT c.*, (SELECT count(*)::int FROM public.news n WHERE n.category_id = c.id) AS news
      FROM public.categories c ORDER BY c.position, c.id`);
    return rows.map((row) => this.view(row));
  }

  /** The active categories, for the site's menu and pages. */
  async published() {
    const rows: CategoryRow[] = await this.database.query('SELECT * FROM public.categories WHERE active ORDER BY position, id');
    return rows.map((row) => this.view(row));
  }

  async create(actor: Actor, input: CategoryInput) {
    requirePermission(actor, 'taxonomy:manage');
    return this.database.transaction(async (manager) => {
      const id = randomUUID();
      const name = i18nString(input.name, { maxLength: 80, required: true });
      const [{ next }]: Array<{ next: number }> = await manager.query('SELECT coalesce(max(position), -1) + 1 AS next FROM public.categories');
      await manager.query(`INSERT INTO public.categories (id, name, slug, description, color, position, active, show_in_menu)
        VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8)`, [
        id, JSON.stringify(name), JSON.stringify(await this.slugs(manager, name, input.slug, null)),
        JSON.stringify(i18nString(input.description, { maxLength: 300, required: false })), this.color(input.color), next,
        input.active ?? true, input.showInMenu ?? true,
      ]);
      await audit(manager, { actorId: actor.userId, action: 'category.created', resourceType: 'category', resourceId: id });
      return this.view(await this.row(manager, id));
    });
  }

  async update(actor: Actor, id: string, input: Partial<CategoryInput>) {
    requirePermission(actor, 'taxonomy:manage');
    return this.database.transaction(async (manager) => {
      const current = await this.row(manager, id);
      const name = input.name === undefined ? current.name : i18nString(input.name, { maxLength: 80, required: true });
      await manager.query(`UPDATE public.categories SET name = $2::jsonb, slug = $3::jsonb, description = $4::jsonb, color = $5, active = $6,
        show_in_menu = $7, updated_at = now() WHERE id = $1`, [
        id, JSON.stringify(name), JSON.stringify(input.slug ? await this.slugs(manager, name, input.slug, id) : current.slug),
        JSON.stringify(input.description === undefined ? current.description : i18nString(input.description, { maxLength: 300, required: false })),
        input.color === undefined ? current.color : this.color(input.color), input.active ?? current.active, input.showInMenu ?? current.show_in_menu,
      ]);
      await audit(manager, { actorId: actor.userId, action: 'category.updated', resourceType: 'category', resourceId: id });
      return this.view(await this.row(manager, id));
    });
  }

  /** A category with news is never removed: its news would lose their section. Deactivate it instead. */
  async remove(actor: Actor, id: string) {
    requirePermission(actor, 'taxonomy:manage');
    await this.database.transaction(async (manager) => {
      await this.row(manager, id);
      const [{ count }]: Array<{ count: number }> = await manager.query('SELECT count(*)::int AS count FROM public.news WHERE category_id = $1', [id]);
      if (count) throw new ConflictException({ statusCode: 409, message: 'The category holds news', code: 'category_in_use' });
      await manager.query('DELETE FROM public.categories WHERE id = $1', [id]);
      await audit(manager, { actorId: actor.userId, action: 'category.deleted', resourceType: 'category', resourceId: id });
    });
  }

  async reorder(actor: Actor, ids: string[]) {
    requirePermission(actor, 'taxonomy:manage');
    await this.database.transaction(async (manager) => {
      const rows: Array<{ id: string }> = await manager.query('SELECT id FROM public.categories FOR UPDATE');
      if (rows.length !== ids.length || !rows.every((row) => ids.includes(row.id))) throw new BadRequestException();
      for (const [position, id] of ids.entries()) await manager.query('UPDATE public.categories SET position = $2 WHERE id = $1', [id, position]);
      await audit(manager, { actorId: actor.userId, action: 'category.reordered' });
    });
    return this.list(actor);
  }

  private color(value: string | undefined): string {
    if (value === undefined) return 'blue';
    if (!(CATEGORY_COLORS as readonly string[]).includes(value)) throw new BadRequestException();
    return value;
  }

  /** Each language's slug: the one given, else one from the name in that language (or the other). */
  private async slugs(manager: EntityManager, name: I18nString, wanted: { pt?: string; en?: string } | undefined, id: string | null) {
    const result: Record<string, string> = {};
    for (const locale of CONTENT_LOCALES) {
      const given = wanted?.[locale]?.trim();
      if (given && !SLUG.test(given)) throw new BadRequestException({ statusCode: 400, message: 'Invalid slug', code: 'slug_invalid' });
      result[locale] = await uniqueSlug(manager, 'categories', locale, given || slugify(name[locale] ?? name.pt ?? name.en ?? ''), id);
    }
    return result;
  }

  private async row(manager: EntityManager, id: string): Promise<CategoryRow> {
    const [row]: CategoryRow[] = await manager.query(`SELECT c.*, (SELECT count(*)::int FROM public.news n WHERE n.category_id = c.id) AS news
      FROM public.categories c WHERE c.id = $1`, [id]);
    if (!row) throw new NotFoundException();
    return row;
  }

  view(row: CategoryRow) {
    return {
      id: row.id, name: row.name, slug: row.slug, description: row.description, color: row.color, position: row.position, active: row.active,
      showInMenu: row.show_in_menu, ...(row.news !== undefined ? { news: row.news } : {}),
    };
  }
}
