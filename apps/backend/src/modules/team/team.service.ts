import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { DataSource, type EntityManager } from 'typeorm';
import { hashAdminPassword } from '../../common/access/access.service.js';
import { ACCESS_PERMISSION, normalizePermissions, requirePermission, type Actor, type Permission } from '../../common/access/permissions.js';
import { generateTemporaryPassword } from '../../common/access/temporary-password.js';
import { audit } from '../../common/audit/audit.js';
import { i18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import { avatarKey } from '../../common/storage/avatar-assets.js';
import { AVATAR_MIME_TYPE } from '../../common/storage/avatar-image.js';
import { StorageService } from '../../common/storage/storage.service.js';

interface RoleRow { id: string; name: string; slug: string; description: string | null; is_system: boolean; permissions: Permission[]; members: number }
interface UserRow {
  id: string; name: string; email: string; avatar_updated_at: Date | null; role_id: string; enabled: boolean; requires_password_change: boolean;
  job_title: I18nString; bio: I18nString; created_at: Date; last_login_at: Date | null; news?: number;
}

const USER_COLUMNS = `u.id, u.name, u.email, u.avatar_updated_at, u.role_id, u.enabled, u.requires_password_change, u.job_title, u.bio, u.created_at, u.last_login_at,
  (SELECT count(*)::int FROM public.news n WHERE n.author_id = u.id) AS news`;
const ROLE_COLUMNS = `r.id, r.name, r.slug, r.description, r.is_system, r.permissions,
  (SELECT count(*)::int FROM public.users u WHERE u.role_id = r.id AND u.enabled) AS members`;

const presentRole = (role: RoleRow) => ({
  id: role.id, name: role.name, slug: role.slug, description: role.description ?? '', isSystem: role.is_system, permissions: role.permissions, members: role.members,
});
const presentUser = (user: UserRow) => ({
  id: user.id, name: user.name, email: user.email, avatarVersion: user.avatar_updated_at?.toISOString() ?? null, roleId: user.role_id,
  enabled: user.enabled, requiresPasswordChange: user.requires_password_change, jobTitle: user.job_title, bio: user.bio,
  createdAt: user.created_at.toISOString(), lastLoginAt: user.last_login_at?.toISOString() ?? null, news: user.news ?? 0,
});

/**
 * The newsroom's accounts and roles ("Equipe e perfis"). Every write takes the access lock, re-reads the actor's
 * permissions inside the transaction and, before committing, checks that some enabled account still holds
 * `users:manage`, so access can never be lost. Accounts are created with a temporary password shown once.
 */
@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async listRoles(actor: Actor) {
    requirePermission(actor, 'users:manage');
    const rows: RoleRow[] = await this.database.query(`SELECT ${ROLE_COLUMNS} FROM public.roles r ORDER BY r.is_system DESC, r.created_at, r.name`);
    return rows.map(presentRole);
  }

  async createRole(actor: Actor, input: { name: string; description?: string; permissions: Permission[] }) {
    return this.write(actor, async (manager) => {
      const id = randomUUID();
      await manager.query('INSERT INTO public.roles (id, name, slug, description, permissions) VALUES ($1, $2, $3, $4, $5)',
        [id, input.name.trim(), `custom_${randomBytes(6).toString('hex')}`, input.description?.trim() || null, normalizePermissions(input.permissions)]);
      await audit(manager, { actorId: actor.userId, action: 'role.created', resourceType: 'role', resourceId: id });
      return presentRole((await this.role(manager, id))!);
    });
  }

  /** System roles keep their name and may only gain permissions (the database trigger enforces the baseline). */
  async updateRole(actor: Actor, id: string, input: { name: string; description?: string; permissions: Permission[] }) {
    return this.write(actor, async (manager) => {
      const role = await this.role(manager, id, true);
      if (!role) throw new NotFoundException();
      if (role.is_system && (input.name.trim() !== role.name || (input.description?.trim() || '') !== (role.description ?? ''))) {
        throw new BadRequestException({ statusCode: 400, message: 'System roles keep their name and description', code: 'role_system' });
      }
      try {
        await manager.query('UPDATE public.roles SET name = $2, description = $3, permissions = $4, updated_at = now() WHERE id = $1',
          [id, input.name.trim(), input.description?.trim() || null, normalizePermissions(input.permissions)]);
      } catch (error) {
        if ((error as { code?: string }).code === '23514') throw new BadRequestException({ statusCode: 400, message: 'System roles cannot lose their baseline', code: 'role_baseline' });
        throw error;
      }
      await audit(manager, { actorId: actor.userId, action: 'role.updated', resourceType: 'role', resourceId: id });
      return presentRole((await this.role(manager, id))!);
    });
  }

  async deleteRole(actor: Actor, id: string): Promise<void> {
    await this.write(actor, async (manager) => {
      const role = await this.role(manager, id, true);
      if (!role) throw new NotFoundException();
      if (role.is_system) throw new BadRequestException({ statusCode: 400, message: 'System roles cannot be deleted', code: 'role_system' });
      const [{ count }]: Array<{ count: number }> = await manager.query('SELECT count(*)::int AS count FROM public.users WHERE role_id = $1', [id]);
      if (count > 0) throw new ConflictException({ statusCode: 409, message: 'The role is assigned', code: 'role_in_use' });
      await manager.query('DELETE FROM public.roles WHERE id = $1', [id]);
      await audit(manager, { actorId: actor.userId, action: 'role.deleted', resourceType: 'role', resourceId: id });
    });
  }

  async listUsers(actor: Actor) {
    requirePermission(actor, 'users:manage');
    const rows: UserRow[] = await this.database.query(`SELECT ${USER_COLUMNS} FROM public.users u ORDER BY u.created_at, u.email`);
    return rows.map(presentUser);
  }

  /** The people who may sign news (any enabled account), for the builder's byline: names only. */
  async authors(actor: Actor) {
    requirePermission(actor, 'news:read');
    const rows: Array<{ id: string; name: string; avatar_updated_at: Date | null }> = await this.database.query(
      'SELECT id, name, avatar_updated_at FROM public.users WHERE enabled ORDER BY name, id');
    return rows.map((row) => ({ id: row.id, name: row.name, avatarVersion: row.avatar_updated_at?.toISOString() ?? null }));
  }

  async createUser(actor: Actor, input: { name: string; email: string; roleId: string }) {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashAdminPassword(temporaryPassword);
    return this.write(actor, async (manager) => {
      if (!(await this.role(manager, input.roleId))) throw new BadRequestException({ statusCode: 400, message: 'Unknown role', code: 'role_not_found' });
      const id = randomUUID();
      try {
        await manager.query(`INSERT INTO public.users (id, name, email, password_hash, role_id, requires_password_change) VALUES ($1, $2, $3, $4, $5, true)`,
          [id, input.name.trim(), input.email.trim().toLowerCase(), passwordHash, input.roleId]);
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException({ statusCode: 409, message: 'The e-mail is taken', code: 'email_taken' });
        throw error;
      }
      await audit(manager, { actorId: actor.userId, action: 'user.created', resourceType: 'user', resourceId: id });
      return { ...presentUser((await this.user(manager, id))!), temporaryPassword };
    });
  }

  /** Name, role, access and author profile of another account. One's own role and access cannot be changed. */
  async updateUser(actor: Actor, id: string, input: { name?: string; roleId?: string; enabled?: boolean; jobTitle?: unknown; bio?: unknown }) {
    return this.write(actor, async (manager) => {
      const user = await this.user(manager, id, true);
      if (!user) throw new NotFoundException();
      const roleChanged = input.roleId !== undefined && input.roleId !== user.role_id;
      const accessChanged = input.enabled !== undefined && input.enabled !== user.enabled;
      if (id === actor.userId && (roleChanged || accessChanged)) throw new ForbiddenException();
      if (roleChanged && !(await this.role(manager, input.roleId!))) throw new BadRequestException({ statusCode: 400, message: 'Unknown role', code: 'role_not_found' });
      await manager.query(`UPDATE public.users SET name = $2, role_id = $3, enabled = $4, job_title = $5::jsonb, bio = $6::jsonb, updated_at = now() WHERE id = $1`, [
        id, input.name?.trim() || user.name, input.roleId ?? user.role_id, input.enabled ?? user.enabled,
        JSON.stringify(input.jobTitle === undefined ? user.job_title : i18nString(input.jobTitle, { maxLength: 120, required: false })),
        JSON.stringify(input.bio === undefined ? user.bio : i18nString(input.bio, { maxLength: 1000, required: false })),
      ]);
      if (input.enabled === false) await this.revokeCredentials(manager, id);
      await audit(manager, { actorId: actor.userId, action: 'user.updated', resourceType: 'user', resourceId: id, metadata: {
        fields: [input.name !== undefined && 'name', roleChanged && 'role', accessChanged && 'enabled', input.jobTitle !== undefined && 'jobTitle', input.bio !== undefined && 'bio'].filter(Boolean),
      } });
      return presentUser((await this.user(manager, id))!);
    });
  }

  async issueTemporaryPassword(actor: Actor, id: string): Promise<{ email: string; temporaryPassword: string }> {
    if (id === actor.userId) throw new ForbiddenException();
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashAdminPassword(temporaryPassword);
    return this.write(actor, async (manager) => {
      const user = await this.user(manager, id, true);
      if (!user) throw new NotFoundException();
      if (!user.enabled) throw new ConflictException({ statusCode: 409, message: 'The account is disabled', code: 'user_disabled' });
      await manager.query(`UPDATE public.users SET password_hash = $2, failed_attempts = 0, locked_until = NULL, requires_password_change = true, updated_at = now()
        WHERE id = $1`, [id, passwordHash]);
      await this.revokeCredentials(manager, id);
      await audit(manager, { actorId: actor.userId, action: 'user.temporary_password_issued', resourceType: 'user', resourceId: id });
      return { email: user.email, temporaryPassword };
    });
  }

  /** The signed-in account's own profile: name and author profile are editable here; e-mail and role are not. */
  async profile(actor: Actor) {
    requirePermission(actor);
    const user = await this.user(this.database.manager, actor.userId);
    if (!user) throw new NotFoundException();
    return presentUser(user);
  }

  async updateProfile(actor: Actor, input: { name?: string; jobTitle?: unknown; bio?: unknown }) {
    requirePermission(actor);
    if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 160)) throw new BadRequestException();
    return this.database.transaction(async (manager) => {
      const user = await this.user(manager, actor.userId, true);
      if (!user) throw new NotFoundException();
      await manager.query('UPDATE public.users SET name = $2, job_title = $3::jsonb, bio = $4::jsonb, updated_at = now() WHERE id = $1', [
        actor.userId, input.name?.trim() ?? user.name,
        JSON.stringify(input.jobTitle === undefined ? user.job_title : i18nString(input.jobTitle, { maxLength: 120, required: false })),
        JSON.stringify(input.bio === undefined ? user.bio : i18nString(input.bio, { maxLength: 1000, required: false })),
      ]);
      await audit(manager, { actorId: actor.userId, action: 'user.profile_updated', resourceType: 'user', resourceId: actor.userId });
      return presentUser((await this.user(manager, actor.userId))!);
    });
  }

  /** Replaces a photo with the already re-encoded image: `users:manage` for anyone, or any account for its own. */
  async setAvatar(actor: Actor, id: string, image: Buffer) {
    if (id !== actor.userId) requirePermission(actor, 'users:manage');
    const key = avatarKey();
    await this.storage.uploadRawObject(key, image, AVATAR_MIME_TYPE, image.length);
    let previous: string | null = null;
    try {
      const result = await this.database.transaction(async (manager) => {
        const [row]: Array<{ avatar_key: string | null }> = await manager.query('SELECT avatar_key FROM public.users WHERE id = $1 FOR UPDATE', [id]);
        if (!row) throw new NotFoundException();
        previous = row.avatar_key;
        const [rows]: [Array<{ avatar_updated_at: Date }>, number] = await manager.query(`UPDATE public.users SET avatar_key = $2, avatar_updated_at = clock_timestamp()
          WHERE id = $1 RETURNING avatar_updated_at`, [id, key]);
        await audit(manager, { actorId: actor.userId, action: 'user.avatar_updated', resourceType: 'user', resourceId: id });
        return { avatarVersion: rows[0].avatar_updated_at.toISOString() };
      });
      if (previous) await this.storage.deleteObject(previous).catch(() => this.logger.warn('A replaced photo could not be removed'));
      return result;
    } catch (error) {
      await this.storage.deleteObject(key).catch(() => undefined);
      throw error;
    }
  }

  async removeAvatar(actor: Actor, id: string) {
    if (id !== actor.userId) requirePermission(actor, 'users:manage');
    const previous = await this.database.transaction(async (manager) => {
      const [row]: Array<{ avatar_key: string | null }> = await manager.query('SELECT avatar_key FROM public.users WHERE id = $1 FOR UPDATE', [id]);
      if (!row) throw new NotFoundException();
      if (!row.avatar_key) return null;
      await manager.query('UPDATE public.users SET avatar_key = NULL, avatar_updated_at = NULL WHERE id = $1', [id]);
      await audit(manager, { actorId: actor.userId, action: 'user.avatar_removed', resourceType: 'user', resourceId: id });
      return row.avatar_key;
    });
    if (previous) await this.storage.deleteObject(previous).catch(() => this.logger.warn('A removed photo could not be deleted'));
    return { avatarVersion: null };
  }

  /** Any account of the panel sees its colleagues' photos. */
  async avatar(actor: Actor, id: string): Promise<Readable> {
    requirePermission(actor);
    return this.avatarStream(id);
  }

  /** The photo of an author of published news, for the site's bylines. */
  async publicAvatar(id: string): Promise<Readable> {
    const [row]: unknown[] = await this.database.query(`SELECT 1 FROM public.news WHERE author_id = $1 AND status = 'published' LIMIT 1`, [id]);
    if (!row) throw new NotFoundException();
    return this.avatarStream(id);
  }

  private async avatarStream(id: string): Promise<Readable> {
    const [row]: Array<{ avatar_key: string | null }> = await this.database.query('SELECT avatar_key FROM public.users WHERE id = $1', [id]);
    if (!row?.avatar_key) throw new NotFoundException();
    return this.storage.getObjectStream(row.avatar_key);
  }

  /** Serializes access writes and re-checks the actor inside the transaction, then guards against lockout. */
  private write<Result>(actor: Actor, operation: (manager: EntityManager) => Promise<Result>): Promise<Result> {
    requirePermission(actor, 'users:manage');
    return this.database.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('panel-access'))");
      const [current]: Array<{ permissions: Permission[] }> = await manager.query(`SELECT r.permissions FROM public.users u
        JOIN public.roles r ON r.id = u.role_id WHERE u.id = $1 AND u.enabled`, [actor.userId]);
      requirePermission({ ...actor, permissions: current?.permissions ?? [] }, 'users:manage');
      const result = await operation(manager);
      const [{ count }]: Array<{ count: number }> = await manager.query(`SELECT count(*)::int AS count FROM public.users u JOIN public.roles r ON r.id = u.role_id
        WHERE u.enabled AND $1 = ANY (r.permissions)`, [ACCESS_PERMISSION]);
      if (count === 0) throw new ConflictException({ statusCode: 409, message: 'At least one enabled account must keep access management', code: 'access_lockout' });
      return result;
    });
  }

  private async role(manager: EntityManager, id: string, lock = false): Promise<RoleRow | undefined> {
    const [row]: RoleRow[] = await manager.query(`SELECT ${ROLE_COLUMNS} FROM public.roles r WHERE r.id = $1${lock ? ' FOR UPDATE OF r' : ''}`, [id]);
    return row;
  }

  private async user(manager: EntityManager, id: string, lock = false): Promise<UserRow | undefined> {
    const [row]: UserRow[] = await manager.query(`SELECT ${USER_COLUMNS} FROM public.users u WHERE u.id = $1${lock ? ' FOR UPDATE OF u' : ''}`, [id]);
    return row;
  }

  private async revokeCredentials(manager: EntityManager, id: string) {
    await manager.query('DELETE FROM public.sessions WHERE user_id = $1', [id]);
    await manager.query('DELETE FROM public.password_change_tokens WHERE user_id = $1', [id]);
  }
}
