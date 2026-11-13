import { ArrowLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { getPathname } from "@/i18n/navigation";
import { requestSurface } from "@/theme/request-branding";

/** The localized not-found page of both areas: an address the routes do not know, or a record that no longer exists. */
export default async function NotFound() {
  const [translate, locale, surface] = await Promise.all([getTranslations("NotFound"), getLocale(), requestSurface()]);
  const home = getPathname({ locale, href: surface === "panel" ? "/panel/dashboard" : "/site" });
  return <ErrorState kind="not-found" code="404" eyebrow={translate("eyebrow")} title={translate("title")} description={translate("description")}
    actions={<Button component="a" href={home} size="md" leftSection={<ArrowLeft size={18} aria-hidden="true" />}>{translate("home")}</Button>} />;
}
