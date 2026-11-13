"use client";

import { AppShell, Badge, Burger, Container, Group, NavLink, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getPathname, Link, localizedPathname } from "../../i18n/navigation";
import { routeFromPathname, routing, type AppLocale, type AppRoute } from "../../i18n/routing";
import type { Permission } from "../admin/permissions";
import { BrandLogo } from "../shared/brand-logo";
import { ColorSchemeToggle } from "../shared/color-scheme-toggle";
import { AreaBreadcrumbs } from "./area-breadcrumbs";
import { activeEntry, PANEL_NAVIGATION, visibleEntry, type NavEntry } from "./area-navigation";
import { LocaleMenu } from "./locale-menu";
import { UserMenu, type SignedInUser } from "./user-menu";

/** The logos of both schemes, already resolved on the server to same-origin URLs. */
export type BrandLogos = { light: string; dark: string; alt: string };
export type PanelBadges = { review: number; messages: number };

/**
 * The panel's frame: header (menu button, logo, the site's link, theme, language and account), the navigation drawn
 * from `area-navigation.ts` for the account's permissions, and the breadcrumbs of the current route.
 */
export function PanelShell({ user, permissions, logo, siteUrl, badges, logout, children }: {
  user: SignedInUser; permissions: readonly Permission[]; logo: BrandLogos; siteUrl: string; badges: PanelBadges;
  logout: () => Promise<void>; children: ReactNode;
}) {
  const translate = useTranslations();
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const route = routeFromPathname(pathname, "panel");
  const [opened, { toggle, close }] = useDisclosure();
  const options = routing.locales.map((value) => ({
    locale: value, label: translate(`Locales.${value}`), name: translate(`Locales.names.${value}`),
    href: localizedPathname(pathname, "panel", value) ?? getPathname({ locale: value, href: "/panel/dashboard" }),
  }));
  const sections = PANEL_NAVIGATION.map((section) => ({ ...section, entries: section.entries.filter((entry) => visibleEntry(entry, permissions)) }))
    .filter((section) => section.entries.length > 0);
  return <AppShell header={{ height: 68 }} navbar={{ width: 248, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="lg" className="panel-workspace">
    <AppShell.Header className="panel-header">
      <Group justify="space-between" h="100%" px="md" wrap="nowrap" gap="md">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label={translate("Navigation.toggle")} />
          <Link href="/panel/dashboard" className="panel-brand-link" aria-label={translate("Panel.title")}>
            <BrandLogo light={logo.light} dark={logo.dark} alt={logo.alt} className="panel-brand-logo" />
          </Link>
          <Badge variant="light" radius="sm" visibleFrom="xs">{translate("Panel.title")}</Badge>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <NavLink component="a" href={siteUrl} target="_blank" rel="noopener noreferrer" label={translate("Panel.viewSite")} title={translate("Panel.openSite")}
            leftSection={<ExternalLink size={16} aria-hidden="true" />} visibleFrom="md" w="auto" className="panel-site-link" />
          <ColorSchemeToggle />
          <Suspense fallback={null}><LocaleMenu current={locale} options={options} label={translate("Locales.label")} preserveQuery /></Suspense>
          <UserMenu user={user} logout={logout} />
        </Group>
      </Group>
    </AppShell.Header>
    <AppShell.Navbar p="sm" className="panel-navbar">
      <AppShell.Section grow style={{ overflowY: "auto" }}>
        {sections.map((section, index) => <div key={section.label}>
          <Text component="div" size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mt={index === 0 ? 4 : "md"} mb={4} style={{ letterSpacing: "0.05em" }}>
            {translate(section.label)}
          </Text>
          {section.entries.map((entry) => <NavItem key={entry.label} entry={entry} held={permissions} route={route} badges={badges} onNavigate={close} />)}
        </div>)}
      </AppShell.Section>
    </AppShell.Navbar>
    <AppShell.Main>
      <Container size="xl" px={0}>
        <Stack gap="lg">
          <AreaBreadcrumbs route={route} />
          {children}
        </Stack>
      </Container>
    </AppShell.Main>
  </AppShell>;
}

function NavItem({ entry, held, route, badges, onNavigate, nested = false }: {
  entry: NavEntry; held: readonly Permission[]; route: AppRoute | undefined; badges: PanelBadges; onNavigate: () => void; nested?: boolean;
}) {
  const translate = useTranslations();
  const Icon = entry.icon;
  const icon = <Icon size={nested ? 16 : 18} aria-hidden="true" />;
  const count = entry.badge ? badges[entry.badge] : 0;
  if (entry.children) {
    return <NavLink label={translate(entry.label)} leftSection={icon} defaultOpened={activeEntry(entry, route)} childrenOffset={28}>
      {entry.children.filter((child) => visibleEntry(child, held)).map((child) =>
        <NavItem key={child.label} entry={child} held={held} route={route} badges={badges} onNavigate={onNavigate} nested />)}
    </NavLink>;
  }
  if (!entry.href) return null;
  return <NavLink component={Link} href={entry.href} label={translate(entry.label)} leftSection={icon} active={activeEntry(entry, route)} onClick={onNavigate}
    rightSection={count > 0 ? <Badge size="sm" variant="filled" color="accent" circle={count < 10}>{count > 99 ? "99+" : count}</Badge> : undefined} />;
}
