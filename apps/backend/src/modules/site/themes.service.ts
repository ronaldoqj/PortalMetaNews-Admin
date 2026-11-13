import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { parseThemeTokens, type ThemeTokens } from './theme-tokens.js';

export const THEME_SURFACES = ['site', 'panel'] as const;
export type ThemeSurface = typeof THEME_SURFACES[number];
export const THEME_LIMIT = 60;

interface ThemeRow {
  id: string; slug: string | null; name: string; description: string; tokens: ThemeTokens; is_system: boolean;
  created_at: Date; updated_at: Date; updated_by_name: string | null;
}

export interface ThemeInput { name: string; description?: string; tokens?: unknown }

/**
 * The theme manager: every theme is a complete set of design tokens (palettes for both schemes, fields, typography,
 * corners and the site's layout choices). One theme dresses the site and one the panel, each switched in one click;
 * system themes can be duplicated and edited but never deleted, and an active theme cannot be deleted either.
 */
@Injectable()
export class ThemesService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  /** The tokens each surface renders now: read on every page request, so a change shows on the next one. */
  async active(): Promise<Record<ThemeSurface, { id: string; tokens: ThemeTokens }>> {
    const rows: Array<{ surface: ThemeSurface; id: string; tokens: ThemeTokens }> = await this.database.query(`
      SELECT 'site' AS surface, t.id, t.tokens FROM public.settings s JOIN public.themes t ON t.id = s.site_theme_id WHERE s.singleton
      UNION ALL
      SELECT 'panel' AS surface, t.id, t.tokens FROM public.settings s JOIN public.themes t ON t.id = s.panel_theme_id WHERE s.singleton`);
    return Object.fromEntries(rows.map((row) => [row.surface, { id: row.id, tokens: this.tokens(row.tokens) }])) as Record<ThemeSurface, { id: string; tokens: ThemeTokens }>;
  }

  async list(actor: Actor) {
    requirePermission(actor, 'themes:manage');
    const rows: ThemeRow[] = await this.database.query(`SELECT t.*, COALESCE(NULLIF(btrim(u.name), ''), u.email) AS updated_by_name
      FROM public.themes t LEFT JOIN public.users u ON u.id = t.updated_by ORDER BY t.is_system DESC, t.name, t.id`);
    const active = await this.active();
    return { items: rows.map((row) => this.view(row, active)), active: { site: active.site.id, panel: active.panel.id } };
  }

  async get(actor: Actor, id: string) {
    requirePermission(actor, 'themes:manage');
    return this.view(await this.row(this.database.manager, id), await this.active());
  }

  async create(actor: Actor, input: ThemeInput & { from?: string }) {
    requirePermission(actor, 'themes:manage');
    return this.database.transaction(async (manager) => {
      const [{ count }]: Array<{ count: number }> = await manager.query('SELECT count(*)::int AS count FROM public.themes');
      if (count >= THEME_LIMIT) throw new ConflictException({ statusCode: 409, message: 'Too many themes', code: 'theme_limit' });
      const tokens = input.from ? (await this.row(manager, input.from)).tokens : this.parse(input.tokens);
      const id = randomUUID();
      await manager.query(`INSERT INTO public.themes (id, name, description, tokens, created_by, updated_by) VALUES ($1, $2, $3, $4::jsonb, $5, $5)`,
        [id, input.name.trim(), (input.description ?? '').trim(), JSON.stringify(tokens), actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'theme.created', resourceType: 'theme', resourceId: id, metadata: input.from ? { duplicateOf: input.from } : {} });
      return this.view(await this.row(manager, id), await this.active());
    });
  }

  async update(actor: Actor, id: string, input: Partial<ThemeInput>) {
    requirePermission(actor, 'themes:manage');
    return this.database.transaction(async (manager) => {
      const current = await this.row(manager, id, true);
      const tokens = input.tokens === undefined ? current.tokens : this.parse(input.tokens);
      await manager.query(`UPDATE public.themes SET name = $2, description = $3, tokens = $4::jsonb, updated_by = $5, updated_at = now() WHERE id = $1`,
        [id, input.name?.trim() || current.name, input.description === undefined ? current.description : input.description.trim(), JSON.stringify(tokens), actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'theme.updated', resourceType: 'theme', resourceId: id });
      return this.view(await this.row(manager, id), await this.active());
    });
  }

  async remove(actor: Actor, id: string) {
    requirePermission(actor, 'themes:manage');
    await this.database.transaction(async (manager) => {
      const theme = await this.row(manager, id, true);
      if (theme.is_system) throw new ConflictException({ statusCode: 409, message: 'System themes cannot be deleted', code: 'theme_system' });
      const [settings]: Array<{ site_theme_id: string; panel_theme_id: string }> = await manager.query('SELECT site_theme_id, panel_theme_id FROM public.settings WHERE singleton FOR UPDATE');
      if (settings.site_theme_id === id || settings.panel_theme_id === id) {
        throw new ConflictException({ statusCode: 409, message: 'An active theme cannot be deleted', code: 'theme_active' });
      }
      await manager.query('DELETE FROM public.themes WHERE id = $1', [id]);
      await audit(manager, { actorId: actor.userId, action: 'theme.deleted', resourceType: 'theme', resourceId: id });
    });
  }

  /** Makes a theme the one a surface renders. */
  async activate(actor: Actor, id: string, surface: ThemeSurface) {
    requirePermission(actor, 'themes:manage');
    return this.database.transaction(async (manager) => {
      await this.row(manager, id);
      await manager.query(`UPDATE public.settings SET ${surface === 'site' ? 'site_theme_id' : 'panel_theme_id'} = $1, updated_at = now(), updated_by = $2 WHERE singleton`, [id, actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'theme.activated', resourceType: 'theme', resourceId: id, metadata: { surface } });
      return this.list(actor);
    });
  }

  private parse(value: unknown): ThemeTokens {
    const tokens = parseThemeTokens(value);
    if (!tokens) throw new BadRequestException({ statusCode: 400, message: 'Invalid theme tokens', code: 'theme_tokens_invalid' });
    return tokens;
  }

  /** Stored tokens of an older shape still render: anything that no longer parses falls back to the first system theme's shape. */
  private tokens(value: ThemeTokens): ThemeTokens {
    return parseThemeTokens(value) ?? value;
  }

  private async row(manager: EntityManager, id: string, lock = false): Promise<ThemeRow> {
    const [row]: ThemeRow[] = await manager.query(`SELECT t.*, COALESCE(NULLIF(btrim(u.name), ''), u.email) AS updated_by_name
      FROM public.themes t LEFT JOIN public.users u ON u.id = t.updated_by WHERE t.id = $1 ${lock ? 'FOR UPDATE OF t' : ''}`, [id]);
    if (!row) throw new NotFoundException();
    return row;
  }

  private view(row: ThemeRow, active: Record<ThemeSurface, { id: string }>) {
    return {
      id: row.id, slug: row.slug, name: row.name, description: row.description, tokens: this.tokens(row.tokens), system: row.is_system,
      activeOn: THEME_SURFACES.filter((surface) => active[surface]?.id === row.id),
      updatedAt: row.updated_at.toISOString(), updatedBy: row.updated_by_name,
    };
  }
}
