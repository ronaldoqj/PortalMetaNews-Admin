import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/site/contact-form";
import { pageMetadata } from "@/components/site/metadata";
import { PageHeading } from "@/components/site/pagination";
import styles from "@/components/site/site.module.css";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/site/contact">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const translate = await getTranslations({ locale, namespace: "Site.contact" });
  return pageMetadata({ locale, title: translate("title"), description: translate("description"), hrefs: { pt: "/site/contact", en: "/site/contact" } });
}

/** Tips, corrections and requests to the newsroom; the message reaches the panel's inbox. */
export default async function ContactPage() {
  const translate = await getTranslations("Site.contact");
  return <div className={styles.narrow}>
    <PageHeading eyebrow={translate("eyebrow")} title={translate("title")} description={translate("description")} />
    <div className={styles.formCard}><ContactForm /></div>
    <p className={styles.small}>{translate("privacy")}</p>
  </div>;
}
