import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';

export const AUDIT_PAGE_SIZE = 50;
export interface AuditQuery { page: number; action?: string; outcome?: 'success' | 'denied'; from?: string; to?: string; resourceId?: string }

interface AuditRow {
  id: string; created_at: Date; action: string; outcome: string; resource_type: string | null; resource_id: string | null;
  metadata: Record<string, unknown>; actor_id: string | null; actor_email: string | null; actor_name: string | null; total: number;
}
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Read-only view of the append-only audit trail for `audit:read`. Records hold identifiers and what changed, never
 * article text or credentials, so they can be shown as stored. Actors are joined for display.
 */
@Injectable()
export class AuditTrailService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async list(actor: Actor, query: AuditQuery) {
    requirePermission(actor, 'audit:read');
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
    const to = query.to ? new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from >= to)) {
      throw new BadRequestException('Invalid date range');
    }
    const conditions: string[] = [];
    const parameters: unknown[] = [];
    const parameter = (value: unknown) => { parameters.push(value); return `$${parameters.length}`; };
    if (query.action) conditions.push(`l.action ILIKE ${parameter(`%${escapeLike(query.action)}%`)}`);
    if (query.outcome) conditions.push(`l.outcome = ${parameter(query.outcome)}`);
    if (query.resourceId) conditions.push(`l.resource_id = ${parameter(query.resourceId)}::uuid`);
    if (from) conditions.push(`l.created_at >= ${parameter(from)}`);
    if (to) conditions.push(`l.created_at < ${parameter(to)}`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [{ total }]: Array<{ total: number }> = await this.database.query(`SELECT count(*)::int AS total FROM public.audit_logs l ${where}`, parameters);
    const rows: AuditRow[] = await this.database.query(`SELECT l.id, l.created_at, l.action, l.outcome, l.resource_type, l.resource_id, l.metadata,
        l.actor_id, a.email AS actor_email, a.name AS actor_name
      FROM public.audit_logs l LEFT JOIN public.users a ON a.id = l.actor_id ${where}
      ORDER BY l.created_at DESC, l.id DESC LIMIT ${AUDIT_PAGE_SIZE} OFFSET ${parameter((query.page - 1) * AUDIT_PAGE_SIZE)}`, parameters);
    return {
      items: rows.map((row) => ({
        id: row.id, createdAt: row.created_at.toISOString(), action: row.action, outcome: row.outcome, resourceType: row.resource_type,
        resourceId: row.resource_id, metadata: row.metadata ?? {},
        actor: row.actor_id ? { id: row.actor_id, email: row.actor_email, name: row.actor_name } : null,
      })),
      total, page: query.page, pageSize: AUDIT_PAGE_SIZE,
    };
  }
}
