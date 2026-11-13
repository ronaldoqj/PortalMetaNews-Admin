import { getTranslations } from "next-intl/server";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { BrandingManager } from "@/components/themes/branding-manager";
import { siteIdentitySchema } from "@/components/themes/contracts";
import { ApiFailureNotice, Notice, Page } from "@/components/ui";

/** The portal's logos, favicons and default sharing image. */
export default async function BrandingPage() {
  const [t, actor] = await Promise.all([getTranslations("Branding"), currentActor()]);
  if (!hasPermission(actor, "themes:manage")) return <Page title={t("assets.title")}><Notice tone="danger">{t("forbidden")}</Notice></Page>;
  const identity = await panelApi("panel/site", { permission: ["themes:manage", "site:manage"], schema: siteIdentitySchema });
  return <Page title={t("assets.title")} description={t("assets.description")}>
    {identity.ok ? <BrandingManager assets={identity.data.assets} /> : <ApiFailureNotice failure={identity} />}
  </Page>;
}
