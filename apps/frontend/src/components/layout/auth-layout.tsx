import { Container, Group, Stack } from "@mantine/core";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { getPathname, localizedPathname } from "../../i18n/navigation";
import { routing, type AppLocale } from "../../i18n/routing";
import { getRequestBranding } from "../../theme/request-branding";
import { BrandLogo } from "../shared/brand-logo";
import { ColorSchemeToggle } from "../shared/color-scheme-toggle";
import { LocaleMenu } from "./locale-menu";

/** Frame of the panel's sign-in, installation and first-access pages: the logo, theme and language, and the form. */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const [translate, locale, { assets, site }, requestHeaders] = await Promise.all([getTranslations(), getLocale(), getRequestBranding(), headers()]);
  const path = requestHeaders.get("x-pmn-path") ?? "";
  const options = routing.locales.map((value) => ({
    locale: value as AppLocale, label: translate(`Locales.${value}`), name: translate(`Locales.names.${value}`),
    href: localizedPathname(path, "panel", value) ?? getPathname({ locale: value, href: "/panel/login" }),
  }));
  return <main className="auth-workspace">
    <Container size={440} w="100%" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" wrap="nowrap">
          <BrandLogo light={assets.logo} dark={assets.logoDark} alt={site?.siteName ?? translate("Common.brand")} className="auth-brand-logo" />
          <Group gap="xs" wrap="nowrap">
            <ColorSchemeToggle />
            <Suspense fallback={null}><LocaleMenu current={locale} options={options} label={translate("Locales.label")} /></Suspense>
          </Group>
        </Group>
        {children}
      </Stack>
    </Container>
  </main>;
}
