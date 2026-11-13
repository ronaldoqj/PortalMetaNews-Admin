import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { emailSettingsSchema } from "@/components/settings/contracts";
import { EmailSettingsPanel } from "@/components/settings/email-settings";
import { ApiFailureNotice, Page } from "@/components/ui";

export default async function EmailSettingsPage() {
  const [t, actor] = await Promise.all([getTranslations("EmailSettings"), currentActor()]);
  if (!actor || !hasPermission(actor, "settings:manage")) return <ForbiddenNotice title={t("title")} />;
  const settings = await panelApi("panel/settings/email", { permission: "settings:manage", schema: emailSettingsSchema });
  return <Page title={t("title")} description={t("description")}>
    {settings.ok ? <EmailSettingsPanel key={JSON.stringify(settings.data)} settings={settings.data} /> : <ApiFailureNotice failure={settings} />}
  </Page>;
}
