import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';

export interface AuditEntry {
  /** Who acted; null for the system itself (the scheduler, an installation from the environment). */
  actorId: string | null;
  /** `<area>.<event>`, lowercase: `news.published`, `theme.activated`. */
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  outcome?: 'success' | 'denied';
  /** Identifiers and decisions only: never article text, a password, a key or a message body. */
  metadata?: Record<string, unknown>;
}

/** Appends one record to the immutable trail, inside the caller's transaction so it lands with the change it describes. */
export async function audit(manager: EntityManager, entry: AuditEntry): Promise<void> {
  await manager.query(`INSERT INTO public.audit_logs (id, actor_id, action, resource_type, resource_id, outcome, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
  [randomUUID(), entry.actorId, entry.action, entry.resourceType ?? null, entry.resourceId ?? null, entry.outcome ?? 'success', JSON.stringify(entry.metadata ?? {})]);
}
