import { z } from "zod";

/** One record of the append-only audit trail, as `panel/audit` answers it: identifiers and decisions, never content. */
export const auditEntrySchema = z.object({
  id: z.uuid(), createdAt: z.iso.datetime(), action: z.string(), outcome: z.enum(["success", "denied"]),
  resourceType: z.string().nullable(), resourceId: z.string().nullable(), metadata: z.record(z.string(), z.unknown()),
  /** Null for the system itself (the scheduler, an installation from the environment). */
  actor: z.object({ id: z.string(), email: z.string().nullable(), name: z.string().nullable() }).strict().nullable(),
}).strict();
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditPageSchema = z.object({
  items: z.array(auditEntrySchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive(),
}).strict();
export type AuditPage = z.infer<typeof auditPageSchema>;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** The trail's filters, as the address carries them; anything malformed is dropped rather than refused. */
export const auditFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).optional().catch(undefined),
  action: z.string().trim().max(80).optional().catch(undefined),
  outcome: z.enum(["success", "denied"]).optional().catch(undefined),
  from: date.optional().catch(undefined),
  to: date.optional().catch(undefined),
  resourceId: z.uuid().optional().catch(undefined),
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;

/** The areas whose actions the trail names in words; anything else shows its raw name. */
export const AUDIT_AREAS = ["news", "theme", "user", "role", "media", "category", "tag", "site", "settings", "ai_writer", "contact", "front_page", "panel", "password"] as const;
export type AuditArea = (typeof AUDIT_AREAS)[number];

/** The area of an action (`news.published` → `news`), when the trail knows it. */
export function auditArea(action: string): AuditArea | undefined {
  const area = action.split(".", 1)[0];
  return (AUDIT_AREAS as readonly string[]).includes(area) ? area as AuditArea : undefined;
}

/** The message key of a known action (`news.published` → `news_published`). */
export const auditActionKey = (action: string) => action.replace(/\./g, "_");
