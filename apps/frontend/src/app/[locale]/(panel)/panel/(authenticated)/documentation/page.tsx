import { getTranslations } from "next-intl/server";
import { currentActor } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { readCatalog } from "@/components/documentation/catalog";
import { DocumentationIndex } from "@/components/documentation/documentation-index";
import { Notice, Page } from "@/components/ui";

/**
 * Documentação: the repository's guides and rules, as `DOCUMENTATION.md` lists them, published by `scripts/sync-docs.mjs`
 * (`documentation:read`). The permission is checked before any file is read.
 */
export default async function DocumentationPage() {
  const [translate, actor] = await Promise.all([getTranslations("Documentation"), currentActor()]);
  if (!actor || !hasPermission(actor, "documentation:read")) return <ForbiddenNotice title={translate("title")} />;
  const groups = await readCatalog();
  if (!groups?.length) return <Page title={translate("title")} description={translate("description")}><Notice tone="info" title={translate("emptyTitle")}>{translate("empty")}</Notice></Page>;
  return <DocumentationIndex groups={groups} />;
}
