import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi, withQuery } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { aiStatusSchema, mediaListSchema } from "@/components/newsroom/contracts";
import { MediaLibrary } from "@/components/newsroom/media-library";
import { ApiFailureNotice, Page } from "@/components/ui";

const querySchema = z.object({
  q: z.string().max(120).optional().catch(undefined), source: z.enum(["upload", "ai"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

export default async function MediaPage({ searchParams }: PageProps<"/[locale]/panel/media">) {
  const raw = await searchParams;
  const query = querySchema.parse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
  const [translate, actor, list, ai] = await Promise.all([
    getTranslations("Media"), currentActor(),
    panelApi(withQuery("panel/media", { search: query.q, source: query.source, page: query.page }), { permission: ["news:read", "media:manage"], schema: mediaListSchema }),
    panelApi("panel/settings/ai/status", { schema: aiStatusSchema }),
  ]);
  return <Page title={translate("title")} description={translate("description")}>
    {list.ok ? <MediaLibrary data={list.data} ai={ai.ok ? ai.data : null} canManage={hasPermission(actor, "media:manage")} /> : <ApiFailureNotice failure={list} />}
  </Page>;
}
