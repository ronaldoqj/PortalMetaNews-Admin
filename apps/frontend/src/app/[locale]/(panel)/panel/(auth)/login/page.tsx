import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { InstallForm, LoginForm } from "@/components/auth/auth-forms";
import { setupStatusSchema } from "@/components/admin/contracts";
import { adminApi, getPanelSession } from "@/components/admin/server";
import { Notice } from "@/components/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";

/** Sign-in; while no account exists, the installation of the first administrator instead. */
export default async function LoginPage({ searchParams }: PageProps<"/[locale]/panel/login">) {
  const [session, locale, translate, query] = await Promise.all([getPanelSession(), getLocale(), getTranslations("Auth"), searchParams]);
  if (session.kind === "authenticated") redirect(getPathname({ locale, href: "/panel/dashboard" }));
  const status = setupStatusSchema.safeParse(await adminApi("auth/setup-status").catch(() => null));
  if (status.success && status.data.setupRequired) {
    return status.data.setupAvailable ? <InstallForm tokenRequired={status.data.setupTokenRequired} /> : <Notice tone="warning">{translate("setup.unavailable")}</Notice>;
  }
  const error = query.error === "forbidden" || query.error === "unavailable" ? query.error : undefined;
  return <LoginForm error={error} />;
}
