import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button, TextInput } from "@/components/ui";
import { getNewsPage, pageParameter } from "@/components/site/api";
import { pageMetadata } from "@/components/site/metadata";
import { NewsGrid } from "@/components/site/news-card";
import { PageHeading, Pagination } from "@/components/site/pagination";
import styles from "@/components/site/site.module.css";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const queryOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0, 200);

export async function generateMetadata({ params }: PageProps<"/[locale]/site/search">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const translate = await getTranslations({ locale, namespace: "Site.search" });
  // Results pages are useful to readers, not to an index.
  return pageMetadata({ locale, title: translate("title"), description: translate("description"), noIndex: true });
}

/** Search in the published news of the page's language: words of the title, subtitle and text, accents ignored. */
export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/site/search">) {
  const locale = (await params).locale as AppLocale;
  const query = await searchParams;
  const q = queryOf(query.q);
  const page = pageParameter(query.page);
  const [data, translate] = await Promise.all([q ? getNewsPage(locale, page, { q }) : Promise.resolve(null), getTranslations("Site.search")]);
  const base = getPathname({ locale, href: "/site/search" });
  return <>
    <PageHeading title={translate("title")} description={translate("description")}>
      <form action={base} method="get" role="search" className={styles.searchForm}>
        <TextInput name="q" type="search" defaultValue={q} label={translate("label")} placeholder={translate("placeholder")} maxLength={200}
          leftSection={<Search size={16} aria-hidden="true" />} />
        <Button type="submit" style={{ alignSelf: "flex-end" }}>{translate("submit")}</Button>
      </form>
    </PageHeading>
    {!q && <div className={styles.empty}><strong>{translate("prompt")}</strong></div>}
    {q && data && <>
      <p className={styles.meta} role="status" style={{ marginBottom: 20 }}>{translate("results", { count: data.total, query: q })}</p>
      <NewsGrid items={data.items} empty={{ title: translate("empty", { query: q }) }} />
      <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(target) => `${base}?q=${encodeURIComponent(q)}&page=${target}`} />
    </>}
  </>;
}
