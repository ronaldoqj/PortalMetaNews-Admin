import { getTranslations } from "next-intl/server";
import { currentActor } from "@/components/admin/api-call";
import { hasPermission } from "@/components/admin/permissions";
import { CreateDraft } from "@/components/newsroom/create-draft";
import { Notice, Page } from "@/components/ui";

/** A new draft, created from the browser and opened in the builder at once. */
export default async function NewNewsPage() {
  const [translate, actor] = await Promise.all([getTranslations("News"), currentActor()]);
  return <Page title={translate("create")}>
    {hasPermission(actor, "news:write") ? <CreateDraft /> : <Notice tone="warning">{translate("cannotCreate")}</Notice>}
  </Page>;
}
