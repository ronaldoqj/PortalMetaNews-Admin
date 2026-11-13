import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { themeListSchema } from "@/components/themes/contracts";
import { ThemeList } from "@/components/themes/theme-list";
import { ApiFailureNotice, Notice, Page } from "@/components/ui";

/** The theme manager: every theme, where each is active, and what can be done with it. */
export default async function ThemesPage() {
  const [t, actor] = await Promise.all([getTranslations("Themes"), currentActor()]);
  if (!hasPermission(actor, "themes:manage")) return <Page title={t("title")}><Notice tone="danger">{t("forbidden")}</Notice></Page>;
  const themes = await panelApi("panel/themes", { permission: "themes:manage", schema: themeListSchema });
  return <Page title={t("title")}>
    {themes.ok ? <ThemeList data={themes.data} /> : <ApiFailureNotice failure={themes} />}
  </Page>;
}
