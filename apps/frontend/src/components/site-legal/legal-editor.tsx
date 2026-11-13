"use client";

import { Alert, Badge, Group, Stack, Tabs, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Eye, ExternalLink, PencilLine, RotateCcw, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { ConfirmationDialog } from "../shared/confirmation-dialog";
import { useApiErrorMessage } from "../shared/use-api-action";
import { PageHeader } from "../shared/page-header";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { SegmentedControl, Textarea, TextInput } from "../ui/forms/input";
import { restoreLegalDocument, saveLegalDocument } from "./actions";
import { LEGAL_EDITIONS, LEGAL_LIMITS, legalTextSchema, type LegalEdition, type LegalEditionData, type LegalKind, type LegalText } from "./contracts";
import { LegalReader } from "./legal-reader";

const textOf = ({ title, summary, content }: LegalText): LegalText => ({ title, summary, content });
const same = (left: LegalText, right: LegalText) => left.title === right.title && left.summary === right.summary && left.content === right.content;

/**
 * One legal document of the site, edited per language (`pt`, `en`). Each edition keeps its own draft while the other
 * is open, is written in Markdown and previewed exactly as the site reads it; restoring brings back the default text
 * shipped with the code.
 */
export function LegalEditor({ kind, editions, siteUrls }: {
  kind: LegalKind; editions: Record<LegalEdition, LegalEditionData>; siteUrls: Record<LegalEdition, string>;
}) {
  const t = useTranslations("SiteLegal");
  const all = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const refusal = useApiErrorMessage();
  const [saved, setSaved] = useState(editions);
  const [drafts, setDrafts] = useState<Record<LegalEdition, LegalText>>(
    () => Object.fromEntries(LEGAL_EDITIONS.map((edition) => [edition, textOf(editions[edition])])) as Record<LegalEdition, LegalText>);
  const [edition, setEdition] = useState<LegalEdition>("pt");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const current = saved[edition];
  const draft = drafts[edition];
  const dirty = (value: LegalEdition) => !same(drafts[value], textOf(saved[value]));
  const valid = legalTextSchema.safeParse(draft).success;
  const update = (patch: Partial<LegalText>) => { setDrafts({ ...drafts, [edition]: { ...draft, ...patch } }); setError(undefined); };

  function apply(result: Awaited<ReturnType<typeof saveLegalDocument>>, notice: string) {
    if (!result.ok) return setError(refusal(result));
    setSaved({ ...saved, [edition]: result.data });
    setDrafts({ ...drafts, [edition]: textOf(result.data) });
    notifications.show({ color: "teal", message: notice });
    router.refresh();
  }

  return <Stack gap="lg">
    <PageHeader title={t(`${kind}.title`)} description={t(`${kind}.description`)} />
    <Tabs value={edition} onChange={(value) => { if (value) { setEdition(value as LegalEdition); setError(undefined); } }}>
      <Tabs.List>
        {LEGAL_EDITIONS.map((value) => <Tabs.Tab key={value} value={value}
          rightSection={dirty(value) ? <Badge size="xs" circle color="orange" aria-label={t("unsaved")}>•</Badge> : undefined}>
          {t(`editions.${value}.label`)}
        </Tabs.Tab>)}
      </Tabs.List>
    </Tabs>

    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" gap="md">
          <Stack gap={6} miw={0} style={{ flex: "1 1 320px" }}>
            <Group gap="xs">
              <Badge variant="light" color={current.isDefault ? "gray" : "teal"} tt="none">{t(current.isDefault ? "status.default" : "status.custom")}</Badge>
              {dirty(edition) && <Badge variant="light" color="orange" tt="none">{t("unsaved")}</Badge>}
            </Group>
            <Text size="sm" c="dimmed">{t(`editions.${edition}.law`)}</Text>
            {current.updatedAt && <Text size="xs" c="dimmed">{t("updatedBy", {
              date: format.dateTime(new Date(current.updatedAt), { dateStyle: "medium", timeStyle: "short" }), name: current.updatedBy ?? t("someone"),
            })}</Text>}
          </Stack>
          <Group gap="sm">
            <Button component="a" href={siteUrls[edition]} target="_blank" rel="noopener noreferrer" variant="subtle"
              rightSection={<ExternalLink size={14} aria-hidden="true" />}>{t("viewOnSite")}</Button>
            <Button variant="default" leftSection={<RotateCcw size={16} />} disabled={pending || current.isDefault}
              onClick={() => { setError(undefined); setRestoring(true); }}>{t("restore")}</Button>
            <Button leftSection={<Save size={16} />} loading={pending} disabled={!dirty(edition) || !valid}
              onClick={() => startTransition(async () => apply(await saveLegalDocument(kind, edition, draft), t("saved")))}>{t("save")}</Button>
          </Group>
        </Group>
        {error && <Alert color="red" role="alert">{error}</Alert>}

        <SegmentedControl value={mode} onChange={(value) => setMode(value as "edit" | "preview")} w="fit-content" data={[
          { value: "edit", label: <Group gap={6} wrap="nowrap"><PencilLine size={15} aria-hidden="true" />{t("edit")}</Group> },
          { value: "preview", label: <Group gap={6} wrap="nowrap"><Eye size={15} aria-hidden="true" />{t("preview")}</Group> },
        ]} />

        {mode === "edit" ? <Stack gap="md">
          <TextInput label={t("fields.title")} required maxLength={LEGAL_LIMITS.title} value={draft.title} disabled={pending}
            onChange={(event) => update({ title: event.currentTarget.value })} />
          <Textarea label={t("fields.summary")} description={t("fields.summaryHelp")} autosize minRows={2} maxLength={LEGAL_LIMITS.summary}
            value={draft.summary} disabled={pending} onChange={(event) => update({ summary: event.currentTarget.value })} />
          <Textarea label={t("fields.content")} description={t("fields.contentHelp")} required autosize minRows={18} maxRows={40}
            maxLength={LEGAL_LIMITS.content} value={draft.content} disabled={pending} spellCheck
            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: "var(--mantine-font-size-sm)", lineHeight: 1.6 } }}
            onChange={(event) => update({ content: event.currentTarget.value })} />
          <Text size="xs" c="dimmed" ta="right">{t("characters", { count: draft.content.length, max: LEGAL_LIMITS.content })}</Text>
        </Stack> : draft.content.trim()
          ? <LegalReader content={draft.content} header={{ eyebrow: t(`editions.${edition}.label`), title: draft.title, summary: draft.summary }}
            labels={{
              onThisPage: t("onThisPage"), copy: all("Documentation.copy"), copied: all("Documentation.copied"),
              notPublished: all("Documentation.notPublished"), heading: all("Documentation.headingLink"), opensInNewTab: all("Documentation.opensInNewTab"),
              alerts: {
                note: all("Documentation.alerts.note"), tip: all("Documentation.alerts.tip"), important: all("Documentation.alerts.important"),
                warning: all("Documentation.alerts.warning"), caution: all("Documentation.alerts.caution"),
              },
            }} />
          : <Text c="dimmed">{t("emptyPreview")}</Text>}
      </Stack>
    </Card>

    <ConfirmationDialog opened={restoring} pending={pending} tone="warning" title={t("restoreTitle")} confirmLabel={t("restore")}
      description={t("restoreWarning", { edition: t(`editions.${edition}.label`) })} onClose={() => setRestoring(false)}
      onConfirm={() => startTransition(async () => { setRestoring(false); apply(await restoreLegalDocument(kind, edition), t("restored")); })} />
  </Stack>;
}
