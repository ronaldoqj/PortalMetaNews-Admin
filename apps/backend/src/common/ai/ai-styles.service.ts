import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { requirePermission, type Actor } from '../access/permissions.js';
import { audit } from '../audit/audit.js';
import type { Updated } from '../database/sql.js';

export const AI_STYLE_LIMITS = { name: 80, instructions: 4000, count: 20 } as const;
/** The writer's choice of style: a style's id, `none` for no style, or absent (`null`) for the newsroom's default. */
export const NO_STYLE = 'none';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface StyleRow { id: string; name: string; instructions: string; is_default: boolean; created_at: Date; updated_at: Date }
export interface AiStyleInput { name?: string; instructions?: string; isDefault?: boolean }

/** A style choice as conversations store it: a style id, `none`, or `null` for the default. Anything else is refused. */
export function isStyleChoice(value: unknown): value is string | null {
  return value === null || value === NO_STYLE || (typeof value === 'string' && UUID.test(value));
}

/**
 * The newsroom's editorial styles for the AI (`settings:manage`): named instructions that go into the prompts, at
 * most one of them the default. The default applies wherever no one chooses (translation, a new conversation of the
 * AI writer); the writer offers every style. The instructions never reach a log or an audit record.
 */
@Injectable()
export class AiStylesService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  /** Every style, the default first. */
  async list(actor: Actor) {
    requirePermission(actor, 'settings:manage');
    return (await this.rows(this.database.manager)).map((row) => this.view(row));
  }

  /** What the AI writer offers to choose from: names only, for any account that may use the AI. */
  async choices(actor: Actor) {
    requirePermission(actor, 'ai:use');
    return (await this.rows(this.database.manager)).map((row) => ({ id: row.id, name: row.name, isDefault: row.is_default }));
  }

  async create(actor: Actor, input: AiStyleInput) {
    requirePermission(actor, 'settings:manage');
    return this.database.transaction(async (manager) => {
      await manager.query('LOCK TABLE public.ai_styles IN SHARE ROW EXCLUSIVE MODE');
      const [{ count }]: Array<{ count: number }> = await manager.query('SELECT count(*)::int AS count FROM public.ai_styles');
      if (count >= AI_STYLE_LIMITS.count) throw new ConflictException({ statusCode: 409, message: 'Too many styles', code: 'ai_style_limit' });
      const name = this.name(input.name);
      const instructions = this.instructions(input.instructions);
      // The first style is the default: the newsroom starts with one that applies.
      const isDefault = input.isDefault ?? count === 0;
      if (isDefault) await manager.query('UPDATE public.ai_styles SET is_default = false WHERE is_default');
      const id = randomUUID();
      await this.write(manager, () => manager.query(`INSERT INTO public.ai_styles (id, name, instructions, is_default, updated_by) VALUES ($1, $2, $3, $4, $5)`,
        [id, name, instructions, isDefault, actor.userId]));
      await audit(manager, { actorId: actor.userId, action: 'settings.ai_style_created', resourceType: 'ai_style', resourceId: id, metadata: { default: isDefault } });
      return this.view(await this.row(manager, id));
    });
  }

  async update(actor: Actor, id: string, input: AiStyleInput) {
    requirePermission(actor, 'settings:manage');
    return this.database.transaction(async (manager) => {
      const current = await this.row(manager, id, true);
      const isDefault = input.isDefault ?? current.is_default;
      if (isDefault && !current.is_default) await manager.query('UPDATE public.ai_styles SET is_default = false WHERE is_default');
      await this.write(manager, () => manager.query(`UPDATE public.ai_styles SET name = $2, instructions = $3, is_default = $4, updated_at = now(), updated_by = $5
        WHERE id = $1`, [id, input.name === undefined ? current.name : this.name(input.name),
        input.instructions === undefined ? current.instructions : this.instructions(input.instructions), isDefault, actor.userId]));
      await audit(manager, { actorId: actor.userId, action: 'settings.ai_style_updated', resourceType: 'ai_style', resourceId: id, metadata: { default: isDefault } });
      return this.view(await this.row(manager, id));
    });
  }

  /** Removing the default leaves the newsroom without one until another is marked. */
  async remove(actor: Actor, id: string) {
    requirePermission(actor, 'settings:manage');
    await this.database.transaction(async (manager) => {
      const [, removed]: Updated<StyleRow> = await manager.query('DELETE FROM public.ai_styles WHERE id = $1 RETURNING id', [id]);
      if (!removed) throw new NotFoundException();
      await audit(manager, { actorId: actor.userId, action: 'settings.ai_style_removed', resourceType: 'ai_style', resourceId: id });
    });
  }

  /** The instructions of the default style, or none. */
  async defaultInstructions(): Promise<string> {
    const [row]: StyleRow[] = await this.database.query('SELECT instructions FROM public.ai_styles WHERE is_default');
    return row?.instructions ?? '';
  }

  /**
   * The instructions a choice stands for: the chosen style's, none for `none`, the default's for `null` or for a style
   * that has been removed since it was chosen.
   */
  async instructionsFor(choice: string | null | undefined): Promise<string> {
    if (choice === NO_STYLE) return '';
    if (choice && UUID.test(choice)) {
      const [row]: StyleRow[] = await this.database.query('SELECT instructions FROM public.ai_styles WHERE id = $1', [choice]);
      if (row) return row.instructions;
    }
    return this.defaultInstructions();
  }

  private rows(manager: EntityManager): Promise<StyleRow[]> {
    return manager.query('SELECT * FROM public.ai_styles ORDER BY is_default DESC, lower(name), id');
  }

  private async row(manager: EntityManager, id: string, lock = false): Promise<StyleRow> {
    const [row]: StyleRow[] = await manager.query(`SELECT * FROM public.ai_styles WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [id]);
    if (!row) throw new NotFoundException();
    return row;
  }

  /** A second style with the same name is refused with a code the panel can explain. */
  private async write(manager: EntityManager, run: () => Promise<unknown>): Promise<void> {
    await manager.query('SAVEPOINT ai_style_write');
    try {
      await run();
      await manager.query('RELEASE SAVEPOINT ai_style_write');
    } catch (error) {
      await manager.query('ROLLBACK TO SAVEPOINT ai_style_write');
      if ((error as { code?: string }).code === '23505') throw new ConflictException({ statusCode: 409, message: 'Name already in use', code: 'ai_style_name_taken' });
      throw error;
    }
  }

  private name(value: string | undefined): string {
    const name = (value ?? '').replace(/\s+/g, ' ').trim();
    if (!name || name.length > AI_STYLE_LIMITS.name) throw new BadRequestException({ statusCode: 400, message: 'Invalid name', code: 'ai_style_invalid' });
    return name;
  }

  private instructions(value: string | undefined): string {
    const instructions = (value ?? '').replace(/\r\n?/g, '\n').trim();
    if (!instructions || instructions.length > AI_STYLE_LIMITS.instructions) {
      throw new BadRequestException({ statusCode: 400, message: 'Invalid instructions', code: 'ai_style_invalid' });
    }
    return instructions;
  }

  private view(row: StyleRow) {
    return {
      id: row.id, name: row.name, instructions: row.instructions, isDefault: row.is_default,
      createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
    };
  }
}
