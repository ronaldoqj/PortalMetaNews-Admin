import { BadRequestException, HttpException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';

/** Submissions per minute of the site's contact form, all readers together. */
const CONTACT_BUDGET = 30;

/**
 * Protection of the forms anyone may post: a honeypot field no person fills, and shared budgets kept in the
 * database (so they hold across API replicas) under hashed bucket names. Budgets are keyed by what is being
 * protected (a form, an account), never by IP address, User-Agent or any other trace of the visitor.
 */
@Injectable()
export class FormProtectionService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  /** The contact form: the honeypot must be empty and the shared budget not used up. */
  async verifyContact(honeypot: string): Promise<void> {
    if (honeypot) throw new BadRequestException('Invalid submission');
    await this.consume('contact:global', CONTACT_BUDGET, 60);
  }

  /** Counts one use of a budget; HTTP 429 once `maximum` uses happened inside the window. */
  async consume(bucket: string, maximum: number, windowSeconds: number, manager: EntityManager = this.database.manager): Promise<void> {
    if (!(await this.allow(bucket, maximum, windowSeconds, manager))) throw new HttpException({ statusCode: 429, message: 'Too many attempts', code: 'rate_limited' }, 429);
  }

  /** The same without failing: false once the budget is used up. */
  async allow(bucket: string, maximum: number, windowSeconds: number, manager: EntityManager = this.database.manager): Promise<boolean> {
    const rows: Array<{ attempts: number }> = await manager.query(`INSERT INTO public.rate_limits AS l (bucket_hash, attempts, expires_at)
      VALUES ($1, 1, now() + make_interval(secs => $3))
      ON CONFLICT (bucket_hash) DO UPDATE SET
        attempts = CASE WHEN l.expires_at <= now() THEN 1 ELSE least(l.attempts + 1, $2 + 1) END,
        expires_at = CASE WHEN l.expires_at <= now() THEN now() + make_interval(secs => $3) ELSE l.expires_at END
      RETURNING attempts`, [createHash('sha256').update(bucket).digest(), maximum, windowSeconds]);
    return rows[0].attempts <= maximum;
  }
}
