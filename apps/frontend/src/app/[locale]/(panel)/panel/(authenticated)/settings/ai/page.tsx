import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { AiSettingsPanel } from "@/components/settings/ai-settings";
import { aiSettingsSchema, aiStyleSchema } from "@/components/settings/contracts";
import { ApiFailureNotice, Page } from "@/components/ui";

export default async function AiSettingsPage() {
  const [t, actor] = await Promise.all([getTranslations("AiSettings"), currentActor()]);
  if (!actor || !hasPermission(actor, "settings:manage")) return <ForbiddenNotice title={t("title")} />;
  const [settings, styles] = await Promise.all([
    panelApi("panel/settings/ai", { permission: "settings:manage", schema: aiSettingsSchema }),
    panelApi("panel/settings/ai/styles", { permission: "settings:manage", schema: z.array(aiStyleSchema) }),
  ]);
  const failure = !settings.ok ? settings : !styles.ok ? styles : null;
  return <Page title={t("title")} description={t("description")}>
    {settings.ok && styles.ok
      ? <AiSettingsPanel key={JSON.stringify(settings.data)} settings={settings.data} styles={styles.data} />
      : failure && <ApiFailureNotice failure={failure} />}
  </Page>;
}
