// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import {notFound} from 'next/navigation';
import {Locale, hasLocale, NextIntlClientProvider} from 'next-intl';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import {routing} from '@/i18n/routing';
import AppShellClient from "@/components/layout/AppShellClient";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@mantine/core/styles.css';
import "./globals.css";


export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(
  props: Omit<LayoutProps<'/[locale]'>, 'children'>
) {
  const {locale} = await props.params;

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: 'LocaleLayout'
  });

  return {
    title: t('title')
  };
}

export default async function LocaleLayout({
  children,
  params
}: LayoutProps<'/[locale]'>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider>
          <MantineProvider>
            <AppShellClient>{children}</AppShellClient>
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
