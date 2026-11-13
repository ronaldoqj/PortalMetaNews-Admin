import { Alert } from "@mantine/core";
import { getFormatter, getTranslations } from "next-intl/server";
import { getPathname } from "../../i18n/navigation";
import type { AppLocale } from "../../i18n/routing";
import { getLegal } from "../site/api";
import { pageMetadata } from "../site/metadata";
import { PageHeading } from "../site/pagination";
import styles from "../site/site.module.css";
import type { LegalKind } from "./contracts";
import { LegalReader } from "./legal-reader";

const ROUTES = { privacy: "/site/privacy", terms: "/site/terms" } as const;

export async function legalMetadata(kind: LegalKind, locale: AppLocale) {
  const document = await getLegal(kind, locale).catch(() => null);
  const translate = await getTranslations({ locale, namespace: "Site.footer" });
  const title = document?.title ?? translate(kind);
  return pageMetadata({ locale, title, description: document?.summary || title, hrefs: { pt: ROUTES[kind], en: ROUTES[kind] } });
}

/** The privacy policy or the terms of use, as the panel keeps them for the page's language (else the default text). */
export async function LegalPage({ kind, locale }: { kind: LegalKind; locale: AppLocale }) {
  const [translate, format] = await Promise.all([getTranslations("Site"), getFormatter()]);
  const document = await getLegal(kind, locale).catch(() => null);
  // A link in one text to the other stays on the site, in the page's language.
  const pages: Record<string, string> = {
    "/privacidade": getPathname({ locale, href: "/site/privacy" }), "/privacy": getPathname({ locale, href: "/site/privacy" }),
    "/termos-de-uso": getPathname({ locale, href: "/site/terms" }), "/terms-of-use": getPathname({ locale, href: "/site/terms" }),
  };
  return <div className={styles.narrow} style={{ maxWidth: 1040 }}>
    <PageHeading eyebrow={translate("legal.eyebrow")} title={document?.title ?? translate(`footer.${kind}`)} description={document?.summary} />
    {document
      ? <LegalReader content={document.content} siteHref={(path) => pages[path]}
        updated={document.updatedAt ? translate("legal.updatedOn", { date: format.dateTime(new Date(document.updatedAt), { dateStyle: "long" }) }) : undefined}
        labels={{
          onThisPage: translate("legal.onThisPage"), copy: translate("legal.copy"), copied: translate("legal.copied"),
          notPublished: translate("legal.notPublished"), heading: translate("legal.headingLink"), opensInNewTab: translate("legal.opensInNewTab"),
          alerts: {
            note: translate("legal.alerts.note"), tip: translate("legal.alerts.tip"), important: translate("legal.alerts.important"),
            warning: translate("legal.alerts.warning"), caution: translate("legal.alerts.caution"),
          },
        }} />
      : <Alert color="red" role="alert">{translate("legal.unavailable")}</Alert>}
  </div>;
}
