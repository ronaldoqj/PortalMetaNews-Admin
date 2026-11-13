import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { resolveI18nString } from "@/i18n/i18n-string";
import type { AppLocale } from "@/i18n/routing";
import { getHome } from "@/components/site/api";
import { NewsCardView } from "@/components/site/news-card";
import { sectionColor } from "@/components/site/section-color";
import styles from "@/components/site/site.module.css";
import { pageMetadata } from "@/components/site/metadata";
import { JsonLd, websiteJsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/components/seo/site-url";
import { getRequestBranding } from "@/theme/request-branding";

export async function generateMetadata({ params }: PageProps<"/[locale]/site">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const [{ site }, translate] = await Promise.all([getRequestBranding(), getTranslations({ locale, namespace: "Site" })]);
  const name = site?.siteName ?? "Portal Meta News";
  const tagline = resolveI18nString(site?.tagline, locale);
  return {
    ...(await pageMetadata({ locale, title: name, description: resolveI18nString(site?.description, locale) || translate("home.title"), hrefs: { pt: "/site", en: "/site" } })),
    title: { absolute: tagline ? `${name} — ${tagline}` : name },
  };
}

/**
 * The front page: the headline over its cover and the highlights the editors pinned (filled automatically otherwise),
 * the newest items beside the most read of the week, then one column per section of the front page, which leaves out
 * what the top already shows while the section has other items.
 */
export default async function HomePage({ params }: PageProps<"/[locale]/site">) {
  const locale = (await params).locale as AppLocale;
  const [home, translate, { site }] = await Promise.all([getHome(locale), getTranslations("Site"), getRequestBranding()]);
  const name = site?.siteName ?? "Portal Meta News";
  const jsonLd = websiteJsonLd({
    name, url: await siteUrl(getPathname({ locale, href: "/site" })), searchUrl: await siteUrl(getPathname({ locale, href: "/site/search" })),
    language: locale === "pt" ? "pt-BR" : "en",
  });
  if (!home?.headline) {
    return <>
      <h1 className={styles.pageTitle} style={{ marginBottom: 24 }}>{name}</h1>
      <div className={styles.empty}><strong>{translate("home.empty")}</strong><span>{translate("home.emptyHint")}</span></div>
    </>;
  }
  const onTop = new Set([home.headline.id, ...home.highlights.map((item) => item.id)]);
  const blocks = home.sections.map((block) => {
    const fresh = block.items.filter((item) => !onTop.has(item.id));
    return { ...block, items: (fresh.length ? fresh : block.items).slice(0, 4) };
  });
  return <>
    <JsonLd data={jsonLd} />
    <h1 className="visually-hidden" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{translate("home.title")}</h1>
    <section className={styles.homeTop} aria-label={translate("home.highlights")}>
      <NewsCardView item={home.headline} variant="lead" headingLevel={2} priority />
      {home.highlights.length > 0 && <div className={styles.highlights}>
        {home.highlights.map((item, index) => <NewsCardView key={item.id} item={item} variant={index === 0 ? "feature" : "compact"} headingLevel={2}
          subtitle={false} priority={index === 0} />)}
      </div>}
    </section>
    <div className={styles.columns}>
      {home.latest.length > 0 && <section aria-labelledby="latest-heading">
        <div className={styles.sectionHeading}>
          <h2 id="latest-heading">{translate("home.latest")}</h2>
          <Link href="/site/latest">{translate("home.seeAll")}<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className={`${styles.grid} ${styles.listing}`}>{home.latest.slice(0, 6).map((item) => <NewsCardView key={item.id} item={item} />)}</div>
      </section>}
      <aside className={styles.aside}>
        {home.mostRead.length > 0 && <section aria-labelledby="most-read-heading">
          <div className={styles.sectionHeading}><h2 id="most-read-heading">{translate("home.mostRead")}</h2></div>
          <ol className={styles.ranking}>
            {home.mostRead.map((item) => <li key={item.id} style={sectionColor(item.category?.color)}>
              <div>
                {item.category && <span className={styles.rankingSection}>{item.category.name}</span>}
                <Link href={{ pathname: "/site/news/[slug]", params: { slug: item.slug } }}>{item.title}</Link>
              </div>
            </li>)}
          </ol>
        </section>}
        {home.latest.length > 6 && <section aria-labelledby="more-heading">
          <div className={styles.sectionHeading}><h2 id="more-heading">{translate("home.more")}</h2></div>
          <div className={`${styles.stack} ${styles.divided}`}>{home.latest.slice(6, 10).map((item) => <NewsCardView key={item.id} item={item} variant="text" />)}</div>
        </section>}
      </aside>
    </div>
    {blocks.length > 0 && <div className={styles.sectionsGrid}>
      {blocks.map((block) => {
        const href = { pathname: "/site/category/[slug]", params: { slug: block.category.slug } } as const;
        return <section key={block.category.id} className={styles.sectionColumn} style={sectionColor(block.category.color)} aria-labelledby={`section-${block.category.id}`}>
          <h2 id={`section-${block.category.id}`} className={styles.sectionColumnTitle}><Link href={href}>{block.category.name}</Link></h2>
          <NewsCardView item={block.items[0]} variant="feature" subtitle={false} kicker={false} />
          {block.items.length > 1 && <div className={`${styles.stack} ${styles.divided}`}>
            {block.items.slice(1).map((item) => <NewsCardView key={item.id} item={item} variant="text" kicker={false} />)}
          </div>}
          <Link className={styles.more} href={href}>{translate("home.sectionMore", { section: block.category.name })}<ArrowRight size={15} aria-hidden="true" /></Link>
        </section>;
      })}
    </div>}
  </>;
}
