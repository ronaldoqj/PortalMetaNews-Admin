"use client";

import { Badge, Group, Image, SimpleGrid, Stack, Tabs, Text, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, ExternalLink, FilePlus2, ImagePlus, RefreshCcw, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "../../i18n/navigation";
import { resolveI18nString } from "../../i18n/i18n-string";
import { ArticleBody } from "../forms/article-body";
import { mediaSources } from "../forms/article-body";
import { Button, Modal, Textarea, Title, useApiAction } from "../ui";
import { applyProposal, illustrateProposal } from "./actions";
import type { Proposal, SectionNames, WriterMedia } from "./contracts";
import styles from "./writer.module.css";

/**
 * What an answer proposes: the article in both languages (tabs), its section, tags and SEO, and the generated covers to
 * choose from. "Criar rascunho" turns it into a draft of the builder; a conversation linked to a news item can apply it
 * there instead. Another cover can be generated, with the prompt edited.
 */
export function ProposalCard({ messageId, proposal, media, sections, linkedNewsId, canWrite, canIllustrate, onIllustrated, onApplied }: {
  messageId: string; proposal: Proposal; media: WriterMedia[]; sections: SectionNames; linkedNewsId: string | null;
  canWrite: boolean; canIllustrate: boolean; onIllustrated: (media: WriterMedia) => void; onApplied: (newsId: string) => void;
}) {
  const t = useTranslations("Writer.proposal");
  const errors = useTranslations("Writer").raw("errors") as Record<string, string>;
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<"pt" | "en">(locale === "en" ? "en" : "pt");
  const [cover, setCover] = useState<string | null>(media[0]?.id ?? null);
  const [prompt, setPrompt] = useState<string>();
  const apply = useApiAction(applyProposal, { errors });
  const illustrate = useApiAction(illustrateProposal, { success: t("illustrated"), errors });
  const chosen = cover && media.some((item) => item.id === cover) ? cover : media[0]?.id ?? null;
  const version = proposal[tab];
  const section = proposal.categoryId ? resolveI18nString(sections[proposal.categoryId], tab) : "";

  async function create(target: "new" | "linked") {
    const result = await apply.run(messageId, { target, mediaId: chosen });
    if (!result.ok) return;
    notifications.show({ message: t(target === "new" ? "applied" : "appliedLinked"), color: "teal" });
    onApplied(result.data.newsId);
    router.push({ pathname: "/panel/news/[id]", params: { id: result.data.newsId } });
  }

  return <section className={styles.proposal} aria-label={t("title")}>
    <Group justify="space-between" align="center" className={styles.proposalHeader}>
      <Group gap="xs"><Sparkles size={16} aria-hidden="true" /><Text fw={700}>{t("title")}</Text></Group>
      <Badge variant="light" radius="sm">{section || t("noSection")}</Badge>
    </Group>
    <Tabs value={tab} onChange={(value) => setTab(value === "en" ? "en" : "pt")} keepMounted={false}>
      <Tabs.List>
        <Tabs.Tab value="pt">PT</Tabs.Tab>
        <Tabs.Tab value="en">EN</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={tab} pt="md" lang={tab}>
        <Stack gap="sm">
          <Title order={3} className={styles.proposalTitle}>{version.title}</Title>
          {version.subtitle && <Text c="dimmed" fs="italic">{version.subtitle}</Text>}
          <ArticleBody html={version.body} labels={{ aiImage: t("aiImage") }} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" className={styles.seo}>
            <div><Text size="xs" c="dimmed" fw={600}>{t("seoTitle")}</Text><Text size="sm">{version.seoTitle || "—"}</Text></div>
            <div><Text size="xs" c="dimmed" fw={600}>{t("seoDescription")}</Text><Text size="sm">{version.seoDescription || "—"}</Text></div>
          </SimpleGrid>
        </Stack>
      </Tabs.Panel>
    </Tabs>
    {proposal.tags.length > 0 && <Stack gap={4}>
      <Text size="xs" c="dimmed" fw={600}>{t("tags")}</Text>
      <Group gap={6}>{proposal.tags.map((tag, index) => <Badge key={index} variant="outline" radius="sm" tt="none">{resolveI18nString(tag, tab)}</Badge>)}</Group>
    </Stack>}
    <Stack gap={6}>
      <Text size="xs" c="dimmed" fw={600}>{t("covers")}</Text>
      {media.length ? <div className={styles.covers} role="radiogroup" aria-label={t("covers")}>
        {media.map((item) => {
          const sources = mediaSources(item.id);
          const selected = item.id === chosen;
          return <UnstyledButton key={item.id} className={styles.cover} data-selected={selected || undefined} role="radio" aria-checked={selected}
            aria-label={selected ? t("chosen") : t("chooseCover")} onClick={() => setCover(item.id)}>
            <Image src={sources.src} srcSet={sources.srcSet} sizes="240px" alt={resolveI18nString(item.alt, tab)} radius="sm" style={{ backgroundColor: item.color, aspectRatio: `${item.width} / ${item.height}` }} />
            {selected && <span className={styles.coverCheck}><Check size={14} aria-hidden="true" /></span>}
          </UnstyledButton>;
        })}
      </div> : <Text size="sm" c="dimmed">{t("noCover")}</Text>}
      {chosen && version.imageCaption && <Text size="xs" c="dimmed">{t("caption")}: {version.imageCaption}</Text>}
    </Stack>
    <Group gap="xs" className={styles.proposalActions}>
      {proposal.newsId
        ? <Button component={Link} href={{ pathname: "/panel/news/[id]", params: { id: proposal.newsId } }} leftSection={<ExternalLink size={16} aria-hidden="true" />}>{t("open")}</Button>
        : <Button leftSection={<FilePlus2 size={16} aria-hidden="true" />} loading={apply.pending} disabled={!canWrite} onClick={() => void create("new")}>{t("create")}</Button>}
      {linkedNewsId && <Button variant="light" leftSection={<RefreshCcw size={16} aria-hidden="true" />} loading={apply.pending} title={t("applyLinkedHint")}
        onClick={() => void create("linked")}>{t("applyLinked")}</Button>}
      {canIllustrate && <Button variant="default" leftSection={<ImagePlus size={16} aria-hidden="true" />} onClick={() => setPrompt(proposal.imagePrompt)}>{t("illustrate")}</Button>}
    </Group>
    {!canWrite && !proposal.newsId && <Text size="xs" c="dimmed">{t("cannotWrite")}</Text>}
    <Modal opened={prompt !== undefined} onClose={() => !illustrate.pending && setPrompt(undefined)} title={t("illustrateTitle")} size="lg" centered>
      <Stack gap="md">
        <Textarea label={t("illustratePrompt")} value={prompt ?? ""} onChange={(event) => setPrompt(event.currentTarget.value)} maxLength={1000} autosize minRows={3} disabled={illustrate.pending} />
        {illustrate.pending && <Text size="sm" c="dimmed" role="status">{t("illustrating")}</Text>}
        <Group justify="flex-end">
          <Button loading={illustrate.pending} leftSection={<ImagePlus size={16} aria-hidden="true" />} onClick={async () => {
            const result = await illustrate.run(messageId, { prompt: prompt?.trim() || undefined });
            if (result.ok) { onIllustrated(result.data); setCover(result.data.id); setPrompt(undefined); }
          }}>{t("illustrate")}</Button>
        </Group>
      </Stack>
    </Modal>
  </section>;
}
