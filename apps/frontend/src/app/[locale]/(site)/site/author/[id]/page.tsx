import type { Metadata } from "next";
import { Avatar } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { authorAvatarUrl } from "@/components/admin/avatar-urls";
import { getAuthor, getNewsPage, pageParameter } from "@/components/site/api";
import { pageMetadata } from "@/components/site/metadata";
import { NewsGrid } from "@/components/site/news-card";
import { PageHeading, Pagination } from "@/components/site/pagination";
import styles from "@/components/site/site.module.css";
import { PageNotFound } from "@/components/shared/page-not-found";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

async function resolve(params: PageProps<"/[locale]/site/author/[id]">["params"]) {
  const { locale: value, id } = await params;
  const locale = value as AppLocale;
  if (!z.uuid().safeParse(id).success) return null;
  const author = await getAuthor(locale, id);
  return author ? { author, locale } : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/site/author/[id]">): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { author, locale } = resolved;
  const translate = await getTranslations({ locale, namespace: "Site.author" });
  const href = { pathname: "/site/author/[id]", params: { id: author.id } } as const;
  return pageMetadata({ locale, title: author.name, description: author.bio || translate("description", { name: author.name }), hrefs: { pt: href, en: href } });
}

/** An author of published news: photo, role, biography and the news they signed in the page's language. */
export default async function AuthorRoute({ params, searchParams }: PageProps<"/[locale]/site/author/[id]">) {
  const resolved = await resolve(params);
  if (!resolved) return <PageNotFound />;
  const { author, locale } = resolved;
  const page = pageParameter((await searchParams).page);
  const [data, translate] = await Promise.all([getNewsPage(locale, page, { author: author.id }), getTranslations("Site.author")]);
  const base = getPathname({ locale, href: { pathname: "/site/author/[id]", params: { id: author.id } } });
  return <>
    <PageHeading eyebrow={translate("eyebrow")} title={author.name} description={author.bio}>
      {(author.jobTitle || author.avatar) && <div className={styles.authorHead} style={{ marginTop: 16 }}>
        <Avatar src={authorAvatarUrl(author.id, author.avatar)} radius="xl" size={56} color="brand" alt="">{author.name.charAt(0)}</Avatar>
        <span className={styles.meta}>{author.jobTitle}</span>
      </div>}
    </PageHeading>
    <h2 className={styles.sectionHeading} style={{ fontFamily: "var(--mantine-font-family-headings)", fontSize: "1.4rem" }}>{translate("articles", { name: author.name })}</h2>
    <NewsGrid items={data?.items ?? []} empty={{ title: translate("empty") }} />
    {data && <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(target) => `${base}?page=${target}`} />}
  </>;
}
