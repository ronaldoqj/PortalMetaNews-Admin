import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentActor, panelApi } from "../admin/api-call";
import { hasPermission } from "../admin/permissions";
import { PageNotFound } from "../shared/page-not-found";
import { ApiFailureNotice, Notice, Page } from "../ui";
import { aiStatusSchema, conversationDetailSchema, conversationSchema, writerStyleSchema, type SectionNames } from "./contracts";
import { WriterWorkspace } from "./writer-workspace";

const sectionsSchema = z.array(z.object({ id: z.uuid(), name: z.object({ pt: z.string().optional(), en: z.string().optional() }) }));

/**
 * Both addresses of the writer: a new conversation (optionally linked to `newsId`) or one of the account's own. The
 * status, the list and the open conversation load together; the sections name the proposals' suggestions and the
 * editorial styles are offered beside the other options.
 */
export async function WriterPage({ conversationId, newsId }: { conversationId?: string; newsId?: string }) {
  const [t, actor] = await Promise.all([getTranslations("Writer"), currentActor()]);
  if (!hasPermission(actor, "ai:use")) return <Page title={t("title")}><Notice tone="danger">{t("forbidden")}</Notice></Page>;
  if (conversationId && !z.uuid().safeParse(conversationId).success) return <PageNotFound />;
  const [status, list, detail, sections, styles] = await Promise.all([
    panelApi("panel/ai-writer/status", { permission: "ai:use", schema: aiStatusSchema }),
    panelApi("panel/ai-writer/conversations", { permission: "ai:use", schema: z.array(conversationSchema) }),
    conversationId ? panelApi(`panel/ai-writer/conversations/${conversationId}`, { permission: "ai:use", schema: conversationDetailSchema }) : Promise.resolve(null),
    panelApi("panel/categories", { schema: sectionsSchema.or(z.array(z.object({ id: z.uuid(), name: z.record(z.string(), z.string()) }).loose())) }),
    panelApi("panel/ai-writer/styles", { permission: "ai:use", schema: z.array(writerStyleSchema) }),
  ]);
  if (detail && !detail.ok && detail.error === "notFound") return <PageNotFound />;
  const failure = !status.ok ? status : !list.ok ? list : detail && !detail.ok ? detail : null;
  if (failure) return <Page title={t("title")}><ApiFailureNotice failure={failure} /></Page>;
  if (!status.ok || !list.ok || (detail && !detail.ok)) return null;
  const names: SectionNames = sections.ok ? Object.fromEntries(sections.data.map((section) => [section.id, section.name])) : {};
  return <WriterWorkspace status={status.data} conversations={list.data} conversation={detail?.ok ? detail.data : null}
    linkNewsId={!conversationId && newsId && z.uuid().safeParse(newsId).success ? newsId : null} sections={names} editorialStyles={styles.ok ? styles.data : []}
    canWrite={hasPermission(actor, "news:write")} canIllustrate={hasPermission(actor, "media:manage")} canConfigure={hasPermission(actor, "settings:manage")} />;
}
