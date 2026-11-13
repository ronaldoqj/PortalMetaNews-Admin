"use client";

import { Drawer, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Menu as MenuIcon, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getPathname, Link, localizedPathname } from "../../i18n/navigation";
import { routing, type AppLocale } from "../../i18n/routing";
import { LocaleMenu } from "../layout/locale-menu";
import { BrandLogo } from "../shared/brand-logo";
import { ColorSchemeToggle } from "../shared/color-scheme-toggle";
import { Button, TextInput } from "../ui";
import { sectionColor } from "./section-color";
import styles from "./site.module.css";

export type HeaderSection = { id: string; name: string; slug: string; color: string };

/** Whether the element has left the top of the viewport: the header condenses once the slim bar above it scrolls away. */
function useScrolledPast() {
  const ref = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, past] as const;
}

/**
 * The site's header: a slim bar with the date, the colour scheme and the language; the masthead with the logo, the
 * sections (underlined in their colour) and the search, which opens a panel below the masthead; on phones the sections
 * move into a drawer. The masthead stays at the top and condenses once the page scrolls. The language switch opens the
 * same page in the other language: the pages whose address differs by language (an article, a section, a tag) resolve
 * the other language's address themselves, so the link here only needs the route.
 */
export function SiteHeader({ siteName, tagline, dateLabel, logo, sections }: {
  siteName: string; tagline: string; dateLabel: string; logo: { light: string; dark: string }; sections: readonly HeaderSection[];
}) {
  const translate = useTranslations();
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const [opened, { open, close }] = useDisclosure(false);
  const [searching, setSearching] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const [topbar, condensed] = useScrolledPast();
  useEffect(() => { if (searching) searchInput.current?.focus(); }, [searching]);
  // The address as the reader sees it (`/pt/editoria/politica`), not next-intl's internal template.
  const current = decodeURI(pathname.replace(/\/$/, ""));
  const options = routing.locales.map((value) => ({
    locale: value, label: translate(`Locales.${value}`), name: translate(`Locales.names.${value}`),
    href: localizedPathname(current, "site", value) ?? getPathname({ locale: value, href: "/site" }),
  }));
  const searchAction = getPathname({ locale, href: "/site/search" });
  const active = (slug: string) => current === getPathname({ locale, href: { pathname: "/site/category/[slug]", params: { slug } } });
  const searchLabel = translate("Site.menu.searchLabel");
  return <>
    <div ref={topbar} className={styles.topbar}>
      <div className={`${styles.container} ${styles.topbarInner}`}>
        <span className={styles.topbarDate}>{dateLabel}</span>
        <div className={styles.topbarTools}>
          <ColorSchemeToggle />
          <Suspense fallback={null}><LocaleMenu current={locale} options={options} label={translate("Site.menu.language")} preserveQuery /></Suspense>
        </div>
      </div>
    </div>
    <header className={styles.header} data-condensed={condensed ? "" : undefined}>
      <div className={`${styles.container} ${styles.mastheadWrap}`}>
        <div className={styles.masthead}>
          <Link href="/site" className={styles.brand} aria-label={siteName}>
            <BrandLogo light={logo.light} dark={logo.dark} alt={siteName} className={styles.logo} />
            {tagline && <p className={styles.tagline}>{tagline}</p>}
          </Link>
          <nav className={styles.nav} aria-label={translate("Site.menu.label")}>
            <Link href="/site/latest" className={styles.navLink} aria-current={current === getPathname({ locale, href: "/site/latest" }) ? "page" : undefined}>
              {translate("Site.menu.latest")}
            </Link>
            {sections.map((section) => <Link key={section.id} href={{ pathname: "/site/category/[slug]", params: { slug: section.slug } }}
              className={styles.navLink} style={sectionColor(section.color)} aria-current={active(section.slug) ? "page" : undefined}>{section.name}</Link>)}
          </nav>
          <div className={styles.headerActions}>
            <button ref={searchToggle} type="button" className={styles.headerAction} onClick={() => setSearching((value) => !value)}
              aria-label={searching ? translate("Site.menu.searchClose") : searchLabel} title={searching ? translate("Site.menu.searchClose") : searchLabel}
              aria-expanded={searching} aria-controls="site-search-panel">
              {searching ? <X size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}
            </button>
            <button type="button" className={`${styles.headerAction} ${styles.burger}`} onClick={open} aria-label={translate("Site.menu.open")} aria-expanded={opened}>
              <MenuIcon size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div id="site-search-panel" className={styles.searchPanel} data-open={searching ? "" : undefined} inert={!searching}
        onKeyDown={(event) => { if (event.key === "Escape") { setSearching(false); searchToggle.current?.focus(); } }}>
        <div className={styles.searchPanelInner}>
          <form action={searchAction} method="get" role="search" className={`${styles.container} ${styles.searchPanelForm}`}>
            <TextInput ref={searchInput} name="q" type="search" size="md" radius="xl" placeholder={translate("Site.menu.searchPlaceholder")}
              aria-label={searchLabel} maxLength={200} leftSection={<Search size={17} aria-hidden="true" />} />
            <Button type="submit" size="md" radius="xl">{translate("Site.menu.searchSubmit")}</Button>
          </form>
        </div>
      </div>
    </header>
    <Drawer opened={opened} onClose={close} position="right" size="xs" title={siteName} closeButtonProps={{ "aria-label": translate("Site.menu.close") }}>
      <Stack gap="lg">
        <form action={searchAction} method="get" role="search">
          <TextInput name="q" type="search" radius="xl" placeholder={translate("Site.menu.searchPlaceholder")} aria-label={searchLabel} maxLength={200}
            leftSection={<Search size={15} aria-hidden="true" />} />
        </form>
        <nav className={styles.drawerNav} aria-label={translate("Site.menu.label")}>
          <Link href="/site" onClick={close}>{translate("Site.menu.home")}</Link>
          <Link href="/site/latest" onClick={close}>{translate("Site.menu.latest")}</Link>
          {sections.map((section) => <Link key={section.id} href={{ pathname: "/site/category/[slug]", params: { slug: section.slug } }} onClick={close}
            style={sectionColor(section.color)} aria-current={active(section.slug) ? "page" : undefined}>{section.name}</Link>)}
        </nav>
      </Stack>
    </Drawer>
  </>;
}
