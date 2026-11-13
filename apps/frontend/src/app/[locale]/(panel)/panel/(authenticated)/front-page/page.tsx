import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { categorySchema, frontPageSchema, newsViewSchema } from "@/components/newsroom/contracts";
import { FrontPageEditor } from "@/components/newsroom/front-page-editor";
import { ApiFailureNotice, Page } from "@/components/ui";

/** The front page: what the editors pin to the top of the home page, with the titles of what is pinned now. */
export default async function FrontPagePage() {
  const [translate, actor, frontPage, categories] = await Promise.all([
    getTranslations("FrontPage"), currentActor(), panelApi("panel/front-page", { permission: "news:read", schema: frontPageSchema }),
    panelApi("panel/categories", { schema: z.array(categorySchema) }),
  ]);
  if (!frontPage.ok) return <Page title={translate("title")}><ApiFailureNotice failure={frontPage} /></Page>;
  const ids = [frontPage.data.headline, ...frontPage.data.highlights].filter((id): id is string => !!id);
  const pinned = (await Promise.all(ids.map((id) => panelApi(`panel/news/${id}`, { permission: "news:read", schema: newsViewSchema }))))
    .flatMap((result) => (result.ok ? [{ id: result.data.id, title: result.data.title }] : []));
  return <Page title={translate("title")} description={translate("description")}>
    <FrontPageEditor initial={frontPage.data} pinned={pinned} categories={categories.ok ? categories.data : []} canManage={hasPermission(actor, "front_page:manage")} />
  </Page>;
}
