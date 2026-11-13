import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/site-legal/legal-page";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/site/privacy">): Promise<Metadata> {
  return legalMetadata("privacy", (await params).locale as AppLocale);
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/site/privacy">) {
  return <LegalPage kind="privacy" locale={(await params).locale as AppLocale} />;
}
