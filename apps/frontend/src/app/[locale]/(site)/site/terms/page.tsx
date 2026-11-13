import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/site-legal/legal-page";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/site/terms">): Promise<Metadata> {
  return legalMetadata("terms", (await params).locale as AppLocale);
}

export default async function TermsPage({ params }: PageProps<"/[locale]/site/terms">) {
  return <LegalPage kind="terms" locale={(await params).locale as AppLocale} />;
}
