import { Plus, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi, withQuery } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { createNewsAndOpen } from "@/components/newsroom/actions";
import { categorySchema, newsListSchema, NEWS_STATUSES } from "@/components/newsroom/contracts";
import { NewsListView } from "@/components/newsroom/news-list";
import { ApiFailureNotice, Button, Page } from "@/components/ui";
import { Link } from "@/i18n/navigation";

const querySchema = z.object({
  status: z.enum(NEWS_STATUSES).optional().catch(undefined), q: z.string().max(120).optional().catch(undefined),
  category: z.uuid().optional().catch(undefined), mine: z.enum(["true"]).optional().catch(undefined),
  sort: z.enum(["updated", "published", "views"]).optional().catch(undefined), page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

export default async function NewsPage({ searchParams }: PageProps<"/[locale]/panel/news">) {
  const raw = await searchParams;
  const query = querySchema.parse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
  const [translate, locale, actor, list, categories] = await Promise.all([
    getTranslations("News"), getLocale(), currentActor(),
    panelApi(withQuery("panel/news", { status: query.status, search: query.q, categoryId: query.category, mine: query.mine, sort: query.sort, page: query.page }),
      { permission: "news:read", schema: newsListSchema }),
    panelApi("panel/categories", { schema: z.array(categorySchema) }),
  ]);
  return <Page title={translate("title")} description={translate("description")} actions={<>
    {hasPermission(actor, "ai:use") && <Link href="/panel/ai-writer"><Button component="span" variant="light" color="grape" leftSection={<Sparkles size={16} aria-hidden="true" />}>{translate("createWithAi")}</Button></Link>}
    {hasPermission(actor, "news:write") && <form action={createNewsAndOpen.bind(null, locale)}>
      <Button type="submit" leftSection={<Plus size={16} aria-hidden="true" />}>{translate("create")}</Button>
    </form>}
  </>}>
    {list.ok ? <NewsListView data={list.data} categories={categories.ok ? categories.data : []} /> : <ApiFailureNotice failure={list} />}
  </Page>;
}
