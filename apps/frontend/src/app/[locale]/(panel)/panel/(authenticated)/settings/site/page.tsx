import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { siteDetailsOf, siteIdentitySchema } from "@/components/themes/contracts";
import { SiteDetailsForm } from "@/components/themes/site-details-form";
import { ApiFailureNotice, Notice, Page } from "@/components/ui";

/** The portal's name, tagline, description, default language, contact and social profiles. */
export default async function SiteDetailsPage() {
  const [t, actor] = await Promise.all([getTranslations("Branding.site"), currentActor()]);
  if (!hasPermission(actor, "site:manage")) return <Page title={t("title")}><Notice tone="danger">{t("forbidden")}</Notice></Page>;
  const identity = await panelApi("panel/site", { permission: "site:manage", schema: siteIdentitySchema });
  return <Page title={t("title")} description={t("description")}>
    {identity.ok ? <SiteDetailsForm initial={siteDetailsOf(identity.data)} /> : <ApiFailureNotice failure={identity} />}
  </Page>;
}
