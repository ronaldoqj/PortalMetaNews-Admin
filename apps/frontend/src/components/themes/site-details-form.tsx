"use client";

import { useTranslations } from "next-intl";
import { AutoForm, type FormField } from "../ui";
import { SOCIAL_NETWORKS } from "../../theme/site-settings";
import { saveSiteDetails } from "./actions";
import { siteDetailsSchema, type SiteDetails } from "./contracts";

/** The portal's name, tagline and description in both languages, its default language, contact and social profiles. */
export function SiteDetailsForm({ initial }: { initial: SiteDetails }) {
  const t = useTranslations("Branding.site");
  const fields: Array<FormField<SiteDetails>> = [
    { name: "siteName", type: "text", label: t("siteName"), required: true, maxLength: 80 },
    { name: "tagline", type: "i18n", label: t("tagline"), maxLength: 160 },
    { name: "description", type: "i18n", label: t("descriptionField"), description: t("descriptionHint"), maxLength: 300, multiline: true, wide: true },
    { name: "defaultLocale", type: "select", label: t("defaultLocale"), required: true, options: (["pt", "en"] as const).map((value) => ({ value, label: t(`locales.${value}`) })) },
    { name: "contactEmail", type: "email", label: t("contactEmail"), description: t("contactEmailHint"), maxLength: 254 },
    ...SOCIAL_NETWORKS.map((network): FormField<SiteDetails> => ({
      name: `social_${network}`, type: "url", label: t(`networks.${network}`), placeholder: "https://", maxLength: 300,
    })),
  ];
  return <AutoForm layout="page" fields={fields} initial={initial} schema={siteDetailsSchema} success={t("saved")} errors={t.raw("errors") as Record<string, string>}
    sections={[
      { title: t("sections.identity"), description: t("sections.identityHint"), fields: ["siteName", "tagline", "description"] },
      { title: t("sections.contact"), description: t("sections.contactHint"), fields: ["defaultLocale", "contactEmail"] },
      { title: t("sections.social"), description: t("sections.socialHint"), fields: SOCIAL_NETWORKS.map((network) => `social_${network}`) },
    ]}
    onSubmit={(values) => saveSiteDetails(values)} />;
}
