import { getTranslations } from "next-intl/server";
import { currentActor } from "@/components/admin/api-call";
import { SettingsIndex } from "@/components/settings/settings-index";
import { Page } from "@/components/ui";

/** Configurações: one card per area of settings the account may open. */
export default async function SettingsPage() {
  const [t, actor] = await Promise.all([getTranslations("Settings"), currentActor()]);
  return <Page title={t("title")} description={t("description")}><SettingsIndex permissions={actor?.permissions ?? []} /></Page>;
}
