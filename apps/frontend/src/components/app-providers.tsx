"use client";

import { MantineProvider, type MantineColorScheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  NextIntlClientProvider,
  type AbstractIntlMessages,
} from "next-intl";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { NavigationProgress } from "./shared/navigation-progress";
import { cookieColorSchemeManager } from "../theme/color-scheme";
import { brandingVariablesResolver, createBrandingTheme } from "../theme/theme";
import type { Branding } from "../tokens/branding";

type AppProvidersProps = {
  children: ReactNode;
  locale: string;
  timeZone: string;
  messages: AbstractIntlMessages;
  /** Plain data from the server; the Mantine theme carries functions, so it is built here. */
  branding: Branding;
  /** The preference read on the server, so the client starts from the scheme already rendered. */
  colorScheme: MantineColorScheme;
};

export function AppProviders({ children, locale, timeZone, messages, branding, colorScheme }: AppProvidersProps) {
  const [manager] = useState(cookieColorSchemeManager);
  const theme = useMemo(() => createBrandingTheme(branding), [branding]);
  const resolveVariables = useMemo(() => brandingVariablesResolver(branding), [branding]);
  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={messages}>
      <MantineProvider theme={theme} defaultColorScheme={colorScheme} colorSchemeManager={manager} cssVariablesResolver={resolveVariables}>
        <Notifications position="top-right" />
        <Suspense fallback={null}><NavigationProgress /></Suspense>
        {children}
      </MantineProvider>
    </NextIntlClientProvider>
  );
}
