import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { audit } from '../audit/audit.js';
import { isStrongAdminPassword } from './password-policy.js';
import { isPermission, type Actor, type Permission } from './permissions.js';

/** Lifetime of the restricted token that only allows replacing a temporary password. */
export const PASSWORD_CHANGE_VALIDITY_MINUTES = 15;
export const SESSION_VALIDITY_SECONDS = 12 * 60 * 60;
/** Wrong passwords tolerated before an account is locked, for sign-in and step-up confirmations alike. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const TOKEN = /^[a-zA-Z0-9_-]{43}$/;

export interface SessionGrant { token: string; actor: Actor }
/** Returned instead of a session while the account still holds a temporary password. */
export interface PasswordChangeChallenge { requiresPasswordChange: true; temporaryToken: string }
export type SignInResult = SessionGrant | PasswordChangeChallenge;

export interface PasswordConfirmation {
  confirmed: boolean;
  lockedUntil?: Date;
  remainingAttempts?: number;
}

interface UserRow {
  id: string; email: string; name: string; password_hash: string; role_id: string; enabled: boolean; failed_attempts: number;
  locked_until: Date | null; requires_password_change: boolean; avatar_updated_at: Date | null;
}

export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) throw new Error('Invalid password length');
  return hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export const tokenHash = (token: string): Buffer => createHash('sha256').update(token).digest();

/**
 * The panel's accounts and sessions. Passwords are Argon2id hashes; a session is an opaque random token stored only
 * as its SHA-256, carried by the frontend in an HttpOnly cookie. The account's role is read on every request, so a
 * changed role or a disabled account takes effect on the next call of every session.
 */
@Injectable()
export class AccessService {
  private readonly dummyHash = hashAdminPassword(randomBytes(32).toString('hex'));

  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  /**
   * Verifies the credentials. A definitive password opens the session; a temporary one yields only a short-lived,
   * single-use password-change token, so no session exists until the owner picks a password of their own.
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    const result = await this.database.transaction(async (manager): Promise<SignInResult | null> => {
      const [user]: UserRow[] = await manager.query('SELECT * FROM public.users WHERE email = $1 FOR UPDATE', [email.trim().toLowerCase()]);
      if (!user || !user.enabled || (user.locked_until && user.locked_until > new Date())) {
        await verify(await this.dummyHash, password).catch(() => false);
        return null;
      }
      if (!await verify(user.password_hash, password).catch(() => false)) {
        await this.countFailure(manager, user);
        return null;
      }
      const actor = await this.actorFor(manager, user);
      if (!actor) return null;
      await manager.query('UPDATE public.users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [user.id]);
      if (user.requires_password_change) {
        const temporaryToken = randomBytes(32).toString('base64url');
        await manager.query('DELETE FROM public.password_change_tokens WHERE expires_at <= now()');
        await manager.query(`INSERT INTO public.password_change_tokens (token_hash, user_id, expires_at)
          VALUES ($1, $2, now() + make_interval(mins => $3))
          ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, created_at = now(), expires_at = EXCLUDED.expires_at`,
        [tokenHash(temporaryToken), user.id, PASSWORD_CHANGE_VALIDITY_MINUTES]);
        return { requiresPasswordChange: true, temporaryToken };
      }
      return this.openSession(manager, actor);
    });
    if (!result) throw new UnauthorizedException();
    return result;
  }

  /** Step-up check of the signed-in account's own password before a sensitive action; shares the sign-in counters. */
  async confirmPassword(userId: string, password: string): Promise<PasswordConfirmation> {
    return this.database.transaction(async (manager) => {
      const [user]: UserRow[] = await manager.query('SELECT * FROM public.users WHERE id = $1 FOR UPDATE', [userId]);
      if (!user || !user.enabled) {
        await verify(await this.dummyHash, password).catch(() => false);
        return { confirmed: false };
      }
      if (user.locked_until && user.locked_until > new Date()) return { confirmed: false, lockedUntil: user.locked_until };
      if (!await verify(user.password_hash, password).catch(() => false)) return this.countFailure(manager, user);
      if (user.failed_attempts) await manager.query('UPDATE public.users SET failed_attempts = 0 WHERE id = $1', [user.id]);
      return { confirmed: true };
    });
  }

  private async countFailure(manager: EntityManager, user: UserRow): Promise<PasswordConfirmation> {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const [[{ locked_until }]]: [Array<{ locked_until: Date }>, number] = await manager.query(`UPDATE public.users SET failed_attempts = 0,
        locked_until = now() + make_interval(mins => $2) WHERE id = $1 RETURNING locked_until`, [user.id, LOCKOUT_MINUTES]);
      return { confirmed: false, lockedUntil: locked_until };
    }
    await manager.query('UPDATE public.users SET failed_attempts = $2 WHERE id = $1', [user.id, attempts]);
    return { confirmed: false, remainingAttempts: MAX_FAILED_ATTEMPTS - attempts };
  }

  /** True while no account exists: the panel has not been installed yet. */
  async setupRequired(): Promise<boolean> {
    const [row]: Array<{ exists: boolean }> = await this.database.query('SELECT EXISTS (SELECT 1 FROM public.users) AS exists');
    return !row?.exists;
  }

  /**
   * Installs the panel: creates the first account with the Administrador role and opens its session. Serialized by a
   * lock on the accounts table and refused (409) once any account exists, so two installers can never both succeed.
   */
  async initialSetup(input: { name: string; email: string; password: string }): Promise<SessionGrant>;
  async initialSetup(input: { name: string; email: string; password: string }, options: { session: false }): Promise<null>;
  async initialSetup(input: { name: string; email: string; password: string }, options = { session: true }): Promise<SessionGrant | null> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!name || name.length > 160 || !isStrongAdminPassword(input.password, email)) throw new BadRequestException();
    const passwordHash = await hashAdminPassword(input.password);
    return this.database.transaction(async (manager) => {
      await manager.query('LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE');
      if (!(await this.setupRequiredIn(manager))) throw new ConflictException('The panel is already installed');
      const [role]: Array<{ id: string }> = await manager.query("SELECT id FROM public.roles WHERE slug = 'admin' AND is_system");
      if (!role) throw new ConflictException('The roles are missing; run the database migrations');
      const id = randomUUID();
      await manager.query('INSERT INTO public.users (id, name, email, password_hash, role_id) VALUES ($1, $2, $3, $4, $5)', [id, name, email, passwordHash, role.id]);
      await audit(manager, { actorId: id, action: 'panel.installed', resourceType: 'user', resourceId: id });
      if (!options.session) return null;
      const [user]: UserRow[] = await manager.query('SELECT * FROM public.users WHERE id = $1', [id]);
      const actor = await this.actorFor(manager, user);
      if (!actor) throw new ConflictException();
      return this.openSession(manager, actor);
    });
  }

  private async setupRequiredIn(manager: EntityManager): Promise<boolean> {
    const [row]: Array<{ exists: boolean }> = await manager.query('SELECT EXISTS (SELECT 1 FROM public.users) AS exists');
    return !row?.exists;
  }

  async login(email: string, password: string): Promise<SessionGrant> {
    const result = await this.signIn(email, password);
    if (!('token' in result)) throw new UnauthorizedException();
    return result;
  }

  /**
   * Replaces a temporary password through the restricted token from `signIn`. Reusing the temporary password (409) or
   * failing the policy (400) leaves the token usable; success consumes it, revokes other sessions and opens a new one.
   */
  async forcePasswordChange(temporaryToken: string, newPassword: string): Promise<SessionGrant> {
    if (!TOKEN.test(temporaryToken)) throw new UnauthorizedException();
    const hashed = tokenHash(temporaryToken);
    const [candidate]: Array<{ user_id: string; email: string; password_hash: string }> = await this.database.query(
      `SELECT t.user_id, u.email, u.password_hash FROM public.password_change_tokens t JOIN public.users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.expires_at > now() AND u.enabled AND u.requires_password_change`, [hashed]);
    if (!candidate) throw new UnauthorizedException();
    if (await verify(candidate.password_hash, newPassword).catch(() => false)) throw new ConflictException();
    if (!isStrongAdminPassword(newPassword, candidate.email)) throw new BadRequestException();
    const passwordHash = await hashAdminPassword(newPassword);
    return this.database.transaction(async (manager) => {
      const [consumed]: [unknown[], number] = await manager.query(
        'DELETE FROM public.password_change_tokens WHERE token_hash = $1 AND user_id = $2 AND expires_at > now() RETURNING user_id', [hashed, candidate.user_id]);
      if (!consumed.length) throw new UnauthorizedException();
      const [[user]]: [UserRow[], number] = await manager.query(`UPDATE public.users SET password_hash = $2, requires_password_change = false, failed_attempts = 0,
        locked_until = NULL, updated_at = now() WHERE id = $1 AND enabled RETURNING *`, [candidate.user_id, passwordHash]);
      const actor = user ? await this.actorFor(manager, user) : null;
      if (!actor) throw new UnauthorizedException();
      await manager.query('DELETE FROM public.sessions WHERE user_id = $1', [user.id]);
      await audit(manager, { actorId: user.id, action: 'password.forced_change', resourceType: 'user', resourceId: user.id });
      return this.openSession(manager, actor);
    });
  }

  /** The actor of a session token; 401 for a malformed, unknown or expired token, or a disabled account. */
  async authenticate(token: string): Promise<Actor> {
    if (!TOKEN.test(token)) throw new UnauthorizedException();
    const [user]: UserRow[] = await this.database.query(`SELECT u.* FROM public.sessions s JOIN public.users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.enabled AND NOT u.requires_password_change`, [tokenHash(token)]);
    const actor = user ? await this.actorFor(this.database.manager, user) : null;
    if (!actor) throw new UnauthorizedException();
    return actor;
  }

  async revoke(token: string): Promise<void> {
    if (!TOKEN.test(token)) return;
    await this.database.query('DELETE FROM public.sessions WHERE token_hash = $1', [tokenHash(token)]);
  }

  private async openSession(manager: EntityManager, actor: Actor): Promise<SessionGrant> {
    const token = randomBytes(32).toString('base64url');
    await manager.query('DELETE FROM public.sessions WHERE expires_at <= now()');
    await manager.query('INSERT INTO public.sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))',
      [tokenHash(token), actor.userId, SESSION_VALIDITY_SECONDS]);
    return { token, actor };
  }

  private async actorFor(manager: EntityManager, user: UserRow): Promise<Actor | null> {
    const [role]: Array<{ id: string; name: string; slug: string; is_system: boolean; permissions: unknown }> = await manager.query(
      'SELECT id, name, slug, is_system, permissions FROM public.roles WHERE id = $1', [user.role_id]);
    const granted = role?.permissions;
    if (!role || !Array.isArray(granted) || !granted.every(isPermission)) return null;
    return {
      userId: user.id, email: user.email, name: user.name, avatarVersion: user.avatar_updated_at?.toISOString() ?? null,
      roleId: role.id, roleName: role.name, roleSlug: role.is_system ? role.slug : null, permissions: granted as Permission[],
    };
  }
}
