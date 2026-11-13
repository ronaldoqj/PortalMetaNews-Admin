import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { getHome } from "@/components/site/api";
import { BreakingStrip } from "@/components/site/breaking-strip";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader, type HeaderSection } from "@/components/site/site-header";
import styles from "@/components/site/site.module.css";
import { resolveI18nString } from "@/i18n/i18n-string";
import { routing, type AppLocale } from "@/i18n/routing";
import { getRequestBranding } from "@/theme/request-branding";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/site">): Promise<Metadata> {
  const { locale } = await params;
  const [{ site }, translate] = await Promise.all([getRequestBranding(), getTranslations({ locale, namespace: "Site" })]);
  const name = site?.siteName ?? "Portal Meta News";
  return {
    alternates: {
      types: { "application/rss+xml": routing.locales.map((value) => ({ url: `/feed/${value}`, title: translate("rssTitle", { name, language: value.toUpperCase() }) })) },
    },
  };
}

/**
 * The frame of every page of the site: skip link, header (date, theme, language, logo, sections, search), the breaking
 * news strip, the page and the footer. The identity and the menu come from the API (`public/site`); without the API
 * the page still renders with the bundled identity and no menu.
 */
export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]/site">) {
  const locale = (await params).locale as AppLocale;
  const [{ site, assets }, translate, format] = await Promise.all([getRequestBranding(), getTranslations("Site"), getFormatter()]);
  // The breaking strip is a nicety: the page renders without it when the API cannot answer.
  const home = await getHome(locale).catch(() => null);
  const siteName = site?.siteName ?? "Portal Meta News";
  const sections: HeaderSection[] = (site?.categories ?? []).filter((category) => category.active && category.showInMenu)
    .map((category) => ({ id: category.id, name: resolveI18nString(category.name, locale), slug: category.slug[locale], color: category.color }));
  const logo = { light: assets.logo, dark: assets.logoDark };
  return <div className={styles.shell}>
    <a href="#content" className={styles.skip}>{translate("skipToContent")}</a>
    <SiteHeader siteName={siteName} tagline={resolveI18nString(site?.tagline, locale)} logo={logo} sections={sections}
      dateLabel={format.dateTime(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
    <BreakingStrip items={home?.breaking ?? []} />
    <main id="content" tabIndex={-1} className={styles.main}>
      <div className={styles.container}>{children}</div>
    </main>
    <SiteFooter siteName={siteName} description={resolveI18nString(site?.description, locale)} logo={logo} sections={sections}
      social={site?.social ?? {}} locale={locale} />
  </div>;
}
