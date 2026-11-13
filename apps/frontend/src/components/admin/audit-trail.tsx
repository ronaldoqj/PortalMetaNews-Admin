"use client";

import { Badge, Box, Code, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { RotateCcw, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "../ui/button";
import { Select, TextInput } from "../ui/forms/input";
import { DataView, EmptyState, Notice, Pager, Section, useListingView, useUrlState } from "../ui";
import { auditActionKey, auditArea, type AuditEntry, type AuditFilters, type AuditPage } from "./audit-contracts";
import { ScrollText } from "lucide-react";

type Draft = { action: string; outcome: string; from: string; to: string; resourceId: string };
const EMPTY: Draft = { action: "", outcome: "", from: "", to: "", resourceId: "" };

/** Short, readable form of the stored metadata; values are identifiers and field names, never content. */
function metadataEntries(metadata: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(metadata).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value && typeof value === "object" ? JSON.stringify(value) : String(value)]);
}

/**
 * The append-only audit trail. Filters live in the address, so a view can be shared and reloaded; the server reads
 * them again and the API checks `audit:read`. Known actions are named in words, with the raw name beneath.
 */
export function AuditTrail({ data, filters, error }: { data: AuditPage; filters: AuditFilters; error?: string }) {
  const t = useTranslations("Audit");
  const format = useFormatter();
  // A dense log reads best as rows; cards stay one click away.
  const listView = useListingView("audit", "list");
  const url = useUrlState();
  const [draft, setDraft] = useState<Draft>({
    action: filters.action ?? "", outcome: filters.outcome ?? "", from: filters.from ?? "", to: filters.to ?? "", resourceId: filters.resourceId ?? "",
  });
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "short", timeStyle: "medium" });
  const actionLabel = (action: string) => t.has(`actions.${auditActionKey(action)}`) ? t(`actions.${auditActionKey(action)}`)
    : auditArea(action) ? t("areaAction", { area: t(`areas.${auditArea(action)}`) }) : action;
  const actor = (entry: AuditEntry) => !entry.actor ? { primary: t("system"), secondary: undefined }
    : entry.actor.email ? { primary: entry.actor.name || entry.actor.email, secondary: entry.actor.name ? entry.actor.email : undefined }
      : { primary: t("removedActor"), secondary: entry.actor.id };
  const twoLines = ({ primary, secondary }: { primary: string; secondary?: string }) => <Stack gap={0} miw={0}>
    <Text size="sm" fw={600} style={{ overflowWrap: "anywhere" }}>{primary}</Text>
    {secondary && <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>{secondary}</Text>}
  </Stack>;
  const outcome = (entry: AuditEntry) => <Badge variant="light" color={entry.outcome === "success" ? "teal" : "red"} miw="max-content" tt="none">
    {t(`outcomes.${entry.outcome}`)}
  </Badge>;
  const details = (entry: AuditEntry) => {
    const entries = metadataEntries(entry.metadata);
    return <Stack gap={4} miw={0}>
      {entry.resourceType && <Text size="xs" c="dimmed">{t.has(`resources.${entry.resourceType}`) ? t(`resources.${entry.resourceType}`) : entry.resourceType}</Text>}
      {entry.resourceId && <Code fz="xs" style={{ overflowWrap: "anywhere", whiteSpace: "normal" }}>{entry.resourceId}</Code>}
      {entries.length > 0 && <Group gap={4}>{entries.map(([key, value]) =>
        <Badge key={key} variant="outline" tt="none" size="sm" maw="100%" style={{ whiteSpace: "normal", height: "auto" }}>{key}: {value}</Badge>)}</Group>}
    </Stack>;
  };
  const apply = (next: Draft) => url.set({ ...next });

  return <Stack gap="lg">
    <Box component="form" onSubmit={(event) => { event.preventDefault(); apply(draft); }}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
        <TextInput label={t("filters.action")} placeholder={t("filters.actionPlaceholder")} value={draft.action} maxLength={80}
          onChange={(event) => setDraft({ ...draft, action: event.currentTarget.value })} />
        <Select label={t("filters.outcome")} value={draft.outcome || null} clearable placeholder={t("filters.any")}
          data={["success", "denied"].map((value) => ({ value, label: t(`outcomes.${value}`) }))} onChange={(value) => setDraft({ ...draft, outcome: value ?? "" })} />
        <TextInput label={t("filters.from")} type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.currentTarget.value })} />
        <TextInput label={t("filters.to")} type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.currentTarget.value })} />
        <TextInput label={t("filters.resource")} placeholder={t("filters.resourcePlaceholder")} value={draft.resourceId} maxLength={36}
          onChange={(event) => setDraft({ ...draft, resourceId: event.currentTarget.value.trim() })} />
      </SimpleGrid>
      <Group mt="sm" gap="sm" justify="flex-end">
        <Button variant="default" leftSection={<RotateCcw size={16} aria-hidden="true" />} disabled={url.pending}
          onClick={() => { setDraft(EMPTY); apply(EMPTY); }}>{t("filters.clear")}</Button>
        <Button type="submit" leftSection={<Search size={16} aria-hidden="true" />} loading={url.pending}>{t("filters.apply")}</Button>
      </Group>
    </Box>
    {error && <Notice tone="danger">{error}</Notice>}
    <Section title={t("listTitle")} icon={ScrollText} flush actions={data.items.length > 0 && listView.toggle}>
      <DataView rows={data.items} rowKey={(entry) => entry.id} view={listView.view} minWidth={760}
        empty={<EmptyState plain icon={ScrollText} title={t("empty")} />}
        columns={[
          { key: "action", header: t("columns.action"), card: "title", render: (entry) => twoLines({ primary: actionLabel(entry.action), secondary: entry.action }) },
          { key: "outcome", header: t("columns.outcome"), card: "aside", render: (entry) => outcome(entry) },
          { key: "when", header: t("columns.when"), render: (entry) => <Text size="sm" style={{ whiteSpace: "nowrap" }}>{when(entry.createdAt)}</Text> },
          { key: "actor", header: t("columns.actor"), render: (entry) => twoLines(actor(entry)) },
          { key: "details", header: t("columns.details"), visibleFrom: "md", render: (entry) => <Box maw={360}>{details(entry)}</Box> },
        ]} />
    </Section>
    <Pager total={data.total} pageSize={data.pageSize} label={t("total", { count: data.total })} />
  </Stack>;
}
