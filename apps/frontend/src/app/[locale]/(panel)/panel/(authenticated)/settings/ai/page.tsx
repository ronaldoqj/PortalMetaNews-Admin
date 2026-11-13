import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { AiSettingsPanel } from "@/components/settings/ai-settings";
import { aiSettingsSchema } from "@/components/settings/contracts";
import { ApiFailureNotice, Page } from "@/components/ui";

export default async function AiSettingsPage() {
  const [t, actor] = await Promise.all([getTranslations("AiSettings"), currentActor()]);
  if (!actor || !hasPermission(actor, "settings:manage")) return <ForbiddenNotice title={t("title")} />;
  const settings = await panelApi("panel/settings/ai", { permission: "settings:manage", schema: aiSettingsSchema });
  return <Page title={t("title")} description={t("description")}>
    {settings.ok ? <AiSettingsPanel key={JSON.stringify(settings.data)} settings={settings.data} /> : <ApiFailureNotice failure={settings} />}
  </Page>;
}
