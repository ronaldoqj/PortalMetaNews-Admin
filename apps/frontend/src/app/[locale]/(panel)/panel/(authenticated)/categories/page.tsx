import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { categorySchema } from "@/components/newsroom/contracts";
import { CategoryManager } from "@/components/newsroom/taxonomy";
import { ApiFailureNotice, Page } from "@/components/ui";

export default async function CategoriesPage() {
  const [translate, actor, list] = await Promise.all([getTranslations("Categories"), currentActor(), panelApi("panel/categories", { schema: z.array(categorySchema) })]);
  return <Page title={translate("title")} description={translate("description")}>
    {list.ok ? <CategoryManager items={list.data} canManage={hasPermission(actor, "taxonomy:manage")} /> : <ApiFailureNotice failure={list} />}
  </Page>;
}
