import { getTranslations } from "next-intl/server";
import { currentActor, panelApi, withQuery } from "@/components/admin/api-call";
import { contactFiltersSchema, contactPageSchema } from "@/components/admin/contacts-contracts";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { ApiFailureNotice, Page } from "@/components/ui";
import { ContactInbox } from "./contact-inbox";

/** Mensagens: what readers wrote through the site's contact form (`contacts:read`). */
export default async function ContactsPage({ searchParams }: PageProps<"/[locale]/panel/contacts">) {
  const [t, actor, raw] = await Promise.all([getTranslations("Contacts"), currentActor(), searchParams]);
  if (!actor || !hasPermission(actor, "contacts:read")) return <ForbiddenNotice title={t("title")} />;
  const filters = contactFiltersSchema.parse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
  const data = await panelApi(withQuery("panel/contacts", filters), { permission: "contacts:read", schema: contactPageSchema });
  return <Page title={t("title")} description={t("description")}>
    {data.ok ? <ContactInbox data={data.data} /> : <ApiFailureNotice failure={data} />}
  </Page>;
}
