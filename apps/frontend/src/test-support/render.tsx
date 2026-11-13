import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getMessagesForLocale } from "../i18n/messages";
import type { AppLocale } from "../i18n/routing";

/**
 * Test helper: the markup of `node` inside the providers every page has, with a locale's full catalog in UTC. A
 * missing or malformed message throws, so a test fails instead of rendering the key.
 */
export function renderMarkup(node: ReactNode, { locale = "pt", now }: { locale?: AppLocale; now?: Date } = {}): string {
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={getMessagesForLocale(locale)} timeZone="UTC" now={now}
    onError={(error) => { throw error; }}>
    <MantineProvider>{node}</MantineProvider>
  </NextIntlClientProvider>);
}
