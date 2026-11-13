"use client";

import { Center, Drawer, Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { History, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { resolveI18nString } from "../../i18n/i18n-string";
import type { ContentLocale } from "../../i18n/locales";
import { ArticleBody } from "../forms/article-body";
import { Button, EmptyState, Notice, Title, useConfirmation, useFormat } from "../ui";
import { getRevision, listRevisions, restoreRevision } from "./actions";
import type { NewsView, Revision, RevisionSummary } from "./contracts";

/**
 * The history of an item: one snapshot per save that changed its content (the 50 newest), each previewed in the
 * language being edited and restorable. Restoring makes a new snapshot, so it can be undone the same way.
 */
export function RevisionsDrawer({ newsId, opened, onClose, language, canRestore, onRestored }: {
  newsId: string; opened: boolean; onClose: () => void; language: ContentLocale; canRestore: boolean; onRestored: (view: NewsView) => void;
}) {
  const translate = useTranslations("Builder.revisions");
  const locale = useLocale();
  const format = useFormat();
  const confirmation = useConfirmation();
  const [items, setItems] = useState<RevisionSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Revision | null>(null);
  useEffect(() => {
    if (!opened) return;
    let active = true;
    void listRevisions(newsId).then((result) => {
      if (!active) return;
      if (result.ok) { setItems(result.data); setFailed(false); } else setFailed(true);
    });
    return () => { active = false; };
  }, [opened, newsId]);
  async function open(id: string) {
    const result = await getRevision(newsId, id);
    if (result.ok) setSelected(result.data);
  }
  const close = () => { setSelected(null); setItems(null); onClose(); };
  return <Drawer opened={opened} onClose={close} position="right" size="lg" title={translate("title")}>
    {selected ? <Stack gap="md">
      <Group justify="space-between">
        <Button variant="subtle" size="xs" onClick={() => setSelected(null)}>{translate("back")}</Button>
        {canRestore && <Button size="xs" leftSection={<RotateCcw size={14} aria-hidden="true" />} onClick={() => confirmation.ask({
          title: translate("restoreTitle"), description: translate("restoreDescription"), tone: "warning", confirmLabel: translate("restore"),
          run: async () => {
            const result = await restoreRevision(newsId, selected.id);
            if (result.ok) onRestored(result.data);
            return result;
          },
          success: translate("restored"), done: close,
        })}>{translate("restore")}</Button>}
      </Group>
      <Text size="sm" c="dimmed">{format.dateTime(selected.createdAt)}</Text>
      <Title order={2} size="h3">{selected.snapshot.title?.[language] || translate("noTitle")}</Title>
      {selected.snapshot.subtitle?.[language] && <Text c="dimmed">{selected.snapshot.subtitle[language]}</Text>}
      <ArticleBody html={selected.snapshot.body?.[language] ?? ""} labels={{ aiImage: translate("aiImage") }} />
    </Stack>
      : failed ? <Notice tone="danger">{translate("failed")}</Notice>
        : !items ? <Center py="xl"><Loader /></Center>
          : !items.length ? <EmptyState icon={History} title={translate("empty")} plain />
            : <Stack gap={4}>{items.map((item) => <UnstyledButton key={item.id} onClick={() => void open(item.id)} p="sm" className="app-card-link"
              style={{ borderRadius: "var(--mantine-radius-md)", border: "1px solid var(--app-border)" }}>
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Stack gap={0} miw={0}>
                  <Text size="sm" fw={600} truncate="end">{resolveI18nString(item.title, locale) || translate("noTitle")}</Text>
                  <Text size="xs" c="dimmed">{translate(`reasons.${item.reason}`)} · {item.createdBy ?? translate("system")}</Text>
                </Stack>
                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>{format.relative(item.createdAt)}</Text>
              </Group>
            </UnstyledButton>)}</Stack>}
    {confirmation.dialog}
  </Drawer>;
}
