import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { storageInfoSchema } from "@/components/settings/contracts";
import { StorageSettingsPanel } from "@/components/settings/storage-settings";
import { ApiFailureNotice, Page } from "@/components/ui";

export default async function StorageSettingsPage() {
  const [t, actor] = await Promise.all([getTranslations("Storage"), currentActor()]);
  if (!actor || !hasPermission(actor, "settings:manage")) return <ForbiddenNotice title={t("title")} />;
  const info = await panelApi("panel/settings/storage", { permission: "settings:manage", schema: storageInfoSchema, timeoutMs: 20_000 });
  return <Page title={t("title")} description={t("description")}>
    {info.ok ? <StorageSettingsPanel info={info.data} /> : <ApiFailureNotice failure={info} />}
  </Page>;
}
