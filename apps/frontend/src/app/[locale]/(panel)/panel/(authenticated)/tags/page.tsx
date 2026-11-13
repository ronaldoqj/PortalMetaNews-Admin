import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi, withQuery } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { tagListSchema } from "@/components/newsroom/contracts";
import { TagManager } from "@/components/newsroom/taxonomy";
import { ApiFailureNotice, Page } from "@/components/ui";

const querySchema = z.object({ q: z.string().max(80).optional().catch(undefined), page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined) });

export default async function TagsPage({ searchParams }: PageProps<"/[locale]/panel/tags">) {
  const raw = await searchParams;
  const query = querySchema.parse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
  const [translate, actor, list] = await Promise.all([
    getTranslations("Tags"), currentActor(), panelApi(withQuery("panel/tags", { search: query.q, page: query.page }), { schema: tagListSchema }),
  ]);
  return <Page title={translate("title")} description={translate("description")}>
    {list.ok ? <TagManager items={list.data.items} total={list.data.total} pageSize={list.data.pageSize} canManage={hasPermission(actor, "taxonomy:manage")} />
      : <ApiFailureNotice failure={list} />}
  </Page>;
}
