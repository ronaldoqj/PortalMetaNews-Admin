import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getNewsPage, getTag, pageParameter, slugParameter } from "@/components/site/api";
import type { TagPage } from "@/components/site/contracts";
import { pageMetadata } from "@/components/site/metadata";
import { NewsGrid } from "@/components/site/news-card";
import { PageHeading, Pagination } from "@/components/site/pagination";
import { PageNotFound } from "@/components/shared/page-not-found";
import { getPathname } from "@/i18n/navigation";
import { otherLocale } from "@/i18n/locales";
import type { AppLocale } from "@/i18n/routing";

type Params = PageProps<"/[locale]/site/tag/[slug]">["params"];

/** The tag of the address; a slug of the other language leads to this language's address of the same tag. */
async function resolve(params: Params): Promise<{ tag: TagPage; locale: AppLocale } | null> {
  const { locale: value, slug: raw } = await params;
  const locale = value as AppLocale;
  const slug = slugParameter(raw);
  if (!slug) return null;
  const tag = await getTag(locale, slug);
  if (tag) return { tag, locale };
  const other = await getTag(otherLocale(locale), slug);
  if (other) redirect(getPathname({ locale, href: { pathname: "/site/tag/[slug]", params: { slug: other.slugs[locale] } } }));
  return null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/site/tag/[slug]">): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { tag, locale } = resolved;
  const translate = await getTranslations({ locale, namespace: "Site.tag" });
  return pageMetadata({
    locale, title: translate("title", { name: tag.name }), description: translate("description", { name: tag.name }),
    hrefs: { pt: { pathname: "/site/tag/[slug]", params: { slug: tag.slugs.pt } }, en: { pathname: "/site/tag/[slug]", params: { slug: tag.slugs.en } } },
  });
}

/** Every news item tagged with a subject. */
export default async function TagRoute({ params, searchParams }: PageProps<"/[locale]/site/tag/[slug]">) {
  const resolved = await resolve(params);
  if (!resolved) return <PageNotFound />;
  const { tag, locale } = resolved;
  const page = pageParameter((await searchParams).page);
  const [data, translate] = await Promise.all([getNewsPage(locale, page, { tag: tag.slug }), getTranslations("Site.tag")]);
  const base = getPathname({ locale, href: { pathname: "/site/tag/[slug]", params: { slug: tag.slug } } });
  return <>
    <PageHeading eyebrow={translate("eyebrow")} title={translate("title", { name: tag.name })} description={translate("description", { name: tag.name })} />
    <NewsGrid items={data?.items ?? []} empty={{ title: translate("empty") }} />
    {data && <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(target) => `${base}?page=${target}`} />}
  </>;
}
