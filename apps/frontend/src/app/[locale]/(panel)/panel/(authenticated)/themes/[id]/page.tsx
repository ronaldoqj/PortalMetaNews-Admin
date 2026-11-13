import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { PageNotFound } from "@/components/shared/page-not-found";
import { themeSchema } from "@/components/themes/contracts";
import { ThemeEditor } from "@/components/themes/theme-editor";
import { ApiFailureNotice, Notice, Page } from "@/components/ui";
import { getRequestBranding } from "@/theme/request-branding";

/** One theme's tokens, edited beside a live miniature of the site. */
export default async function ThemeEditorPage({ params }: PageProps<"/[locale]/panel/themes/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return <PageNotFound />;
  const [t, actor, { assets, site }] = await Promise.all([getTranslations("Themes"), currentActor(), getRequestBranding()]);
  if (!hasPermission(actor, "themes:manage")) return <Page title={t("editor.title")}><Notice tone="danger">{t("forbidden")}</Notice></Page>;
  const theme = await panelApi(`panel/themes/${id}`, { permission: "themes:manage", schema: themeSchema });
  if (!theme.ok && theme.error === "notFound") return <PageNotFound />;
  return theme.ok
    ? <ThemeEditor theme={theme.data} assets={{ logo: assets.logo, logoDark: assets.logoDark }} siteName={site?.siteName ?? "Portal Meta News"} />
    : <Page title={t("editor.title")}><ApiFailureNotice failure={theme} /></Page>;
}
