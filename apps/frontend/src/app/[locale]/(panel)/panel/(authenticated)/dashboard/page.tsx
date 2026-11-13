import { Plus, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { NewsroomDashboard } from "@/components/dashboard/newsroom-dashboard";
import { createNewsAndOpen } from "@/components/newsroom/actions";
import { dashboardSchema } from "@/components/newsroom/contracts";
import { ApiFailureNotice, Button, Notice, Page } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** The newsroom's overview, with the two ways to start an article. */
export default async function DashboardPage() {
  const [translate, locale, actor] = await Promise.all([getTranslations("Dashboard"), getLocale(), currentActor()]);
  if (!hasPermission(actor, "news:read")) return <Page title={translate("title")}><Notice tone="info">{translate("noNews")}</Notice></Page>;
  const data = await panelApi("panel/dashboard", { permission: "news:read", schema: dashboardSchema });
  return <Page title={translate("title")} description={translate("greeting", { name: actor?.name.split(" ")[0] || actor?.email || "" })} actions={<>
    {hasPermission(actor, "ai:use") && <Link href="/panel/ai-writer"><Button component="span" variant="light" color="grape" leftSection={<Sparkles size={16} aria-hidden="true" />}>{translate("createWithAi")}</Button></Link>}
    {hasPermission(actor, "news:write") && <form action={createNewsAndOpen.bind(null, locale)}><Button type="submit" leftSection={<Plus size={16} aria-hidden="true" />}>{translate("create")}</Button></form>}
  </>}>
    {data.ok ? <NewsroomDashboard data={data.data} can={{ review: hasPermission(actor, "news:publish") || hasPermission(actor, "news:edit_all"), messages: hasPermission(actor, "contacts:read") }} />
      : <ApiFailureNotice failure={data} />}
  </Page>;
}
