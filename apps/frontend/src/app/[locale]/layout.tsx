import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "../globals.css";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getMessages, getTimeZone, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { fontVariables } from "@/app/fonts";
import { AppProviders } from "@/components/app-providers";
import { clientMessages } from "@/i18n/client-messages";
import { resolveI18nString } from "@/i18n/i18n-string";
import { routing } from "@/i18n/routing";
import { getRequestBranding } from "@/theme/request-branding";
import { COLOR_SCHEME_COOKIE, parseColorScheme } from "@/theme/color-scheme";
import { ColorSchemeScript } from "@/theme/color-scheme-script";
import { brandingStylesheet } from "@/theme/theme";

function favicons(light: string, dark: string) {
  return light === dark
    ? { url: light }
    : [{ url: light, media: "(prefers-color-scheme: light)" }, { url: dark, media: "(prefers-color-scheme: dark)" }];
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const { site, assets, surface } = await getRequestBranding();
  const name = site?.siteName ?? "Portal Meta News";
  return {
    title: { default: surface === "panel" ? `Painel · ${name}` : name, template: `%s · ${name}` },
    description: resolveI18nString(site?.description, locale),
    // Resolved on the server: the portal's favicons, else the bundled ones, one per colour scheme of the browser.
    icons: { icon: favicons(assets.favicon, assets.faviconDark), apple: "/brand/apple-icon.png" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [messages, timeZone, { branding, surface }, requestCookies] = await Promise.all([getMessages(), getTimeZone(), getRequestBranding(), cookies()]);
  const colorScheme = parseColorScheme(requestCookies.get(COLOR_SCHEME_COOKIE)?.value);
  return (
    <html lang={locale} className={fontVariables} data-surface={surface} data-header={branding.site.header} data-cards={branding.site.cards}
      // `auto` renders light on the server and is resolved before the first paint by the script below.
      data-mantine-color-scheme={colorScheme === "dark" ? "dark" : "light"} suppressHydrationWarning>
      {/* Both palettes are part of the first response, so switching or resolving the scheme never waits for the client. */}
      <head>
        {colorScheme === "auto" && <ColorSchemeScript />}
        <style dangerouslySetInnerHTML={{ __html: brandingStylesheet(branding) }} />
      </head>
      <body>
        <AppProviders locale={locale} timeZone={timeZone} messages={clientMessages(messages, surface)} branding={branding} colorScheme={colorScheme}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
