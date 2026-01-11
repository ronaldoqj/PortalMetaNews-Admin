// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import AppShellClient from "@/components/layout/AppShellClient";
// import { Geist, Geist_Mono } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { LayoutHelper } from "@/helpers/LayoutHelper";
import '@mantine/core/styles.css';
import { colorSchemeManager } from '@/components/layout/ColorSchemeCookieManager';
import "./globals.css";


export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export default async function LocaleLayout({
  children,
  params
}: LayoutProps<'/[locale]'>) {
  const {locale} = await params;
  const selectedTheme = await LayoutHelper.getThemeFromCookie();
  const currentThemeName = await LayoutHelper.getCurrentThemeName();
  console.log('selectedTheme', currentThemeName);
  console.log('colorSchemeManager', colorSchemeManager);
  
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);
  console.log("LocaleLayout locale:", locale);

  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme={currentThemeName} />
      </head>
      {/* <body className={`${geistSans.variable} ${geistMono.variable}`}> */}
      <body>
        <NextIntlClientProvider>
          <MantineProvider theme={selectedTheme}
           // forceColorScheme={currentThemeName}
           colorSchemeManager={colorSchemeManager}>
            <AppShellClient>{children}</AppShellClient>
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
