import { IconRss } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { SOCIAL_NETWORKS, type SocialNetwork } from "../../theme/site-settings";
import { BrandLogo } from "../shared/brand-logo";
import type { HeaderSection } from "./site-header";
import { SOCIAL_ICONS } from "./social-icons";
import styles from "./site.module.css";

/** The site's footer: who we are, the sections, the institutional pages, the social profiles, the feed and the rights. */
export function SiteFooter({ siteName, description, logo, sections, social, locale }: {
  siteName: string; description: string; logo: { light: string; dark: string }; sections: readonly HeaderSection[];
  social: Partial<Record<SocialNetwork, string>>; locale: string;
}) {
  const translate = useTranslations("Site");
  const profiles = SOCIAL_NETWORKS.filter((network) => social[network]);
  return <footer className={styles.footer}>
    <div className={`${styles.container} ${styles.footerGrid}`}>
      <div>
        {/* The footer is dark in both schemes, so the dark logo is the one that reads on it. */}
        <BrandLogo light={logo.dark} alt={siteName} className={styles.footerLogo} />
        {description && <p className={styles.footerAbout}>{description}</p>}
        {profiles.length > 0 && <div className={styles.social} aria-label={translate("footer.follow", { name: siteName })}>
          {profiles.map((network) => {
            const Icon = SOCIAL_ICONS[network];
            return <a key={network} href={social[network]} target="_blank" rel="noopener noreferrer me" aria-label={translate(`social.${network}`)} title={translate(`social.${network}`)}>
              <Icon size={18} stroke={1.7} aria-hidden="true" />
            </a>;
          })}
        </div>}
      </div>
      <nav aria-label={translate("footer.sections")}>
        <h2>{translate("footer.sections")}</h2>
        <ul className={styles.footerColumns}>{sections.slice(0, 10).map((section) => <li key={section.id}><Link href={{ pathname: "/site/category/[slug]", params: { slug: section.slug } }}>{section.name}</Link></li>)}</ul>
      </nav>
      <nav aria-label={translate("footer.institutional")}>
        <h2>{translate("footer.institutional")}</h2>
        <ul>
          <li><Link href="/site/contact">{translate("footer.contact")}</Link></li>
          <li><Link href="/site/privacy">{translate("footer.privacy")}</Link></li>
          <li><Link href="/site/terms">{translate("footer.terms")}</Link></li>
        </ul>
      </nav>
      <div>
        <h2>{translate("footer.rss")}</h2>
        <ul><li><a href={`/feed/${locale}`} type="application/rss+xml" className={styles.footerFeed}><IconRss size={15} aria-hidden="true" />{translate("footer.rss")}</a></li></ul>
      </div>
    </div>
    <div className={styles.container}>
      <div className={styles.footerBottom}>
        <span>{translate("footer.rights", { year: new Date().getFullYear(), name: siteName })}</span>
        <span className={styles.footerPrivacy}>{translate("footer.noTracking")}</span>
      </div>
    </div>
  </footer>;
}
