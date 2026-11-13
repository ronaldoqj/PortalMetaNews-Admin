import { headers } from "next/headers";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { aiStatusSchema, authorSchema, categorySchema, newsViewSchema } from "@/components/newsroom/contracts";
import { NewsBuilder } from "@/components/newsroom/news-builder";
import { PageNotFound } from "@/components/shared/page-not-found";
import { ApiFailureNotice } from "@/components/ui";
import { siteDomain } from "@/config/site-hosts";
import { areaUrl } from "@/theme/host-context";

/** The builder of one news item, with what it chooses from: sections, authors and whether the AI answers. */
export default async function NewsBuilderPage({ params }: PageProps<"/[locale]/panel/news/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return <PageNotFound />;
  const [news, categories, authors, ai, actor, requestHeaders] = await Promise.all([
    panelApi(`panel/news/${id}`, { permission: "news:read", schema: newsViewSchema }),
    panelApi("panel/categories", { schema: z.array(categorySchema) }),
    panelApi("panel/team/authors", { permission: "news:read", schema: z.array(authorSchema) }),
    panelApi("panel/settings/ai/status", { schema: aiStatusSchema }),
    currentActor(), headers(),
  ]);
  if (!news.ok) return news.error === "notFound" ? <PageNotFound /> : <ApiFailureNotice failure={news} />;
  const siteOrigin = areaUrl("site", requestHeaders.get("host") ?? "localhost", siteDomain(), "");
  return <NewsBuilder key={news.data.id} news={news.data} categories={categories.ok ? categories.data : []} authors={authors.ok ? authors.data : []}
    ai={ai.ok ? ai.data : null} siteOrigin={siteOrigin}
    can={{ ai: hasPermission(actor, "ai:use"), editAll: hasPermission(actor, "news:edit_all"), createTags: hasPermission(actor, "news:write") || hasPermission(actor, "taxonomy:manage") }} />;
}
