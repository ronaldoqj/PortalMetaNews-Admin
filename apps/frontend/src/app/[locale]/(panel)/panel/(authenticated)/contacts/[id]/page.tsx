import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "@/components/admin/api-call";
import { contactMessageSchema } from "@/components/admin/contacts-contracts";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { PageNotFound } from "@/components/shared/page-not-found";
import { ApiFailureNotice } from "@/components/ui";
import { ContactMessageView } from "./contact-message-view";

export default async function ContactMessagePage({ params }: PageProps<"/[locale]/panel/contacts/[id]">) {
  const [{ id }, t, actor] = await Promise.all([params, getTranslations("Contacts"), currentActor()]);
  if (!actor || !hasPermission(actor, "contacts:read")) return <ForbiddenNotice title={t("title")} />;
  if (!z.uuid().safeParse(id).success) return <PageNotFound />;
  const message = await panelApi(`panel/contacts/${id}`, { permission: "contacts:read", schema: contactMessageSchema });
  if (!message.ok) return message.error === "notFound" ? <PageNotFound /> : <ApiFailureNotice failure={message} />;
  return <ContactMessageView message={message.data} />;
}
