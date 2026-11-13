import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCategory, getNewsPage, pageParameter, slugParameter } from "@/components/site/api";
import type { CategoryPage } from "@/components/site/contracts";
import { pageMetadata } from "@/components/site/metadata";
import { NewsGrid } from "@/components/site/news-card";
import { PageHeading, Pagination } from "@/components/site/pagination";
import { sectionColor } from "@/components/site/section-color";
import { PageNotFound } from "@/components/shared/page-not-found";
import { getPathname } from "@/i18n/navigation";
import { otherLocale } from "@/i18n/locales";
import type { AppLocale } from "@/i18n/routing";

type Params = PageProps<"/[locale]/site/category/[slug]">["params"];

/** The section of the address; a slug of the other language leads to this language's address of the same section. */
async function resolve(params: Params): Promise<{ category: CategoryPage; locale: AppLocale } | null> {
  const { locale: value, slug: raw } = await params;
  const locale = value as AppLocale;
  const slug = slugParameter(raw);
  if (!slug) return null;
  const category = await getCategory(locale, slug);
  if (category) return { category, locale };
  const other = await getCategory(otherLocale(locale), slug);
  if (other) redirect(getPathname({ locale, href: { pathname: "/site/category/[slug]", params: { slug: other.slugs[locale] } } }));
  return null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/site/category/[slug]">): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { category, locale } = resolved;
  return pageMetadata({
    locale, title: category.name, description: category.description || category.name,
    hrefs: { pt: { pathname: "/site/category/[slug]", params: { slug: category.slugs.pt } }, en: { pathname: "/site/category/[slug]", params: { slug: category.slugs.en } } },
  });
}

/** A section (editoria): its description and its news, newest first. */
export default async function CategoryRoute({ params, searchParams }: PageProps<"/[locale]/site/category/[slug]">) {
  const resolved = await resolve(params);
  if (!resolved) return <PageNotFound />;
  const { category, locale } = resolved;
  const page = pageParameter((await searchParams).page);
  const [data, translate] = await Promise.all([getNewsPage(locale, page, { category: category.slug }), getTranslations("Site")]);
  const base = getPathname({ locale, href: { pathname: "/site/category/[slug]", params: { slug: category.slug } } });
  return <>
    <PageHeading eyebrow={translate("category.eyebrow")} title={category.name} description={category.description} color={sectionColor(category.color)} />
    <NewsGrid items={data?.items ?? []} empty={{ title: translate("category.empty") }} kicker={false} />
    {data && <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(target) => `${base}?page=${target}`} />}
  </>;
}
