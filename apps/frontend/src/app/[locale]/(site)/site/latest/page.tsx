import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getNewsPage, pageParameter } from "@/components/site/api";
import { pageMetadata } from "@/components/site/metadata";
import { NewsGrid } from "@/components/site/news-card";
import { PageHeading, Pagination } from "@/components/site/pagination";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/site/latest">): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const translate = await getTranslations({ locale, namespace: "Site.latest" });
  return pageMetadata({ locale, title: translate("title"), description: translate("description"), hrefs: { pt: "/site/latest", en: "/site/latest" } });
}

/** Every published item in the page's language, newest first, twelve per page. */
export default async function LatestPage({ params, searchParams }: PageProps<"/[locale]/site/latest">) {
  const locale = (await params).locale as AppLocale;
  const page = pageParameter((await searchParams).page);
  const [data, translate] = await Promise.all([getNewsPage(locale, page), getTranslations("Site")]);
  const base = getPathname({ locale, href: "/site/latest" });
  return <>
    <PageHeading title={translate("latest.title")} description={translate("latest.description")} />
    <NewsGrid items={data?.items ?? []} empty={{ title: translate("home.empty"), hint: translate("home.emptyHint") }} />
    {data && <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(target) => `${base}?page=${target}`} />}
  </>;
}
