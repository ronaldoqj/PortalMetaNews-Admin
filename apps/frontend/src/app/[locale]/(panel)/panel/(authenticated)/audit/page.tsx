import { getTranslations } from "next-intl/server";
import { currentActor, panelApi, withQuery } from "@/components/admin/api-call";
import { auditFiltersSchema, auditPageSchema } from "@/components/admin/audit-contracts";
import { AuditTrail } from "@/components/admin/audit-trail";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { Page } from "@/components/ui";

/** Auditoria: the append-only trail of what every account did (`audit:read`). */
export default async function AuditPage({ searchParams }: PageProps<"/[locale]/panel/audit">) {
  const [t, actor, raw] = await Promise.all([getTranslations("Audit"), currentActor(), searchParams]);
  if (!actor || !hasPermission(actor, "audit:read")) return <ForbiddenNotice title={t("title")} />;
  const filters = auditFiltersSchema.parse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
  const invalidRange = !!(filters.from && filters.to && filters.from > filters.to);
  const data = invalidRange ? null : await panelApi(withQuery("panel/audit", filters), { permission: "audit:read", schema: auditPageSchema });
  // The filters stay usable when a request fails, so an invalid range can be corrected.
  return <Page title={t("title")} description={t("description")}>
    <AuditTrail filters={filters} data={data?.ok ? data.data : { items: [], total: 0, page: 1, pageSize: 50 }}
      error={invalidRange ? t("invalidRange") : data && !data.ok ? t("unavailable") : undefined} />
  </Page>;
}
