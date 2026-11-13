"use client";

import { AspectRatio, Badge, Drawer, Group, Stack, Text } from "@mantine/core";
import { Images, Pencil, Sparkles, Trash2, Upload, WandSparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { resolveI18nString } from "../../i18n/i18n-string";
import { useState } from "react";
import { useRouter } from "../../i18n/navigation";
import { AutoForm, Button, DataView, DetailList, EmptyState, FilterBar, FilterSelect, Modal, Pager, SearchField, Section, useConfirmation, useFormat, useListingView, type Column, type FormField } from "../ui";
import { deleteMedia, updateMedia } from "./actions";
import { mediaMetadataInputSchema, type AiStatus, type MediaItem, type MediaList, type MediaMetadataInput } from "./contracts";
import { MediaGenerator, MediaUploader } from "./media-shared";

/**
 * The media library: every image the news use, uploaded or generated, searchable and described in both languages.
 * An image in use (as a cover or inside a body) is never deleted.
 */
export function MediaLibrary({ data, ai, canManage }: { data: MediaList; ai: AiStatus | null; canManage: boolean }) {
  const translate = useTranslations("Media");
  const router = useRouter();
  const [adding, setAdding] = useState<"upload" | "generate" | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const added = () => { setAdding(null); router.refresh(); };
  const locale = useLocale();
  const format = useFormat();
  const listView = useListingView("media");
  const name = (item: MediaItem) => item.title || resolveI18nString(item.alt, locale) || translate("untitled");
  const columns: Column<MediaItem>[] = [
    { key: "preview", header: translate("columns.preview"), card: "cover", width: 120, render: (item) =>
      <AspectRatio ratio={16 / 10} data-cover="" style={{ backgroundColor: item.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin immutable renditions, already sized */}
        <img src={`/media/${item.id}/sm`} alt={resolveI18nString(item.alt, locale)} loading="lazy" decoding="async" />
      </AspectRatio> },
    { key: "title", header: translate("columns.title"), card: "title", render: (item) => <Stack gap={2} miw={0}>
      <Text fw={600} size="sm" lineClamp={2}>{name(item)}</Text>
      {item.credit && <Text size="xs" c="dimmed" truncate="end">{item.credit}</Text>}
    </Stack> },
    { key: "source", header: translate("source"), card: "aside", render: (item) => item.source === "ai"
      ? <Badge variant="light" color="grape" tt="none" leftSection={<Sparkles size={11} aria-hidden="true" />}>{translate("sources.ai")}</Badge>
      : <Badge variant="light" color="gray" tt="none">{translate("sources.upload")}</Badge> },
    { key: "size", header: translate("info.size"), visibleFrom: "md", render: (item) => <Text size="sm">{item.width} × {item.height} · {format.bytes(item.bytes)}</Text> },
    { key: "usage", header: translate("info.usage"), visibleFrom: "sm", render: (item) => <Text size="sm">{translate("info.usageCount", { count: item.usage })}</Text> },
    { key: "created", header: translate("info.created"), visibleFrom: "lg", render: (item) => <Text size="sm" c="dimmed">{format.relative(item.createdAt)}</Text> },
  ];
  return <Stack gap="md">
    <FilterBar end={canManage && <>
      <Button variant="light" color="grape" leftSection={<WandSparkles size={16} aria-hidden="true" />} onClick={() => setAdding("generate")}>{translate("generate")}</Button>
      <Button leftSection={<Upload size={16} aria-hidden="true" />} onClick={() => setAdding("upload")}>{translate("upload")}</Button>
    </>}>
      <SearchField label={translate("search")} />
      <FilterSelect param="source" label={translate("source")} data={[{ value: "upload", label: translate("sources.upload") }, { value: "ai", label: translate("sources.ai") }]} />
    </FilterBar>
    <Section title={translate("listTitle")} icon={Images} flush actions={data.items.length > 0 && listView.toggle}>
      <DataView rows={data.items} columns={columns} rowKey={(item) => item.id} view={listView.view} minWidth={720} onOpen={setSelected}
        empty={<EmptyState plain icon={Images} title={translate("empty")} description={translate("emptyHint")} />}
        actions={(item) => [{ label: translate(canManage ? "actions.edit" : "actions.view"), icon: Pencil, onClick: () => setSelected(item) }]} />
    </Section>
    <Pager total={data.total} pageSize={data.pageSize} label={translate("count", { count: data.total })} />
    <Modal opened={adding !== null} onClose={() => setAdding(null)} title={translate(adding === "generate" ? "generateTitle" : "uploadTitle")} size="lg" radius="lg">
      {adding === "upload" && <MediaUploader onUploaded={added} />}
      {adding === "generate" && <MediaGenerator ai={ai} onGenerated={added} />}
    </Modal>
    <MediaDetails item={selected} canManage={canManage} onClose={() => setSelected(null)} />
  </Stack>;
}

function MediaDetails({ item, canManage, onClose }: { item: MediaItem | null; canManage: boolean; onClose: () => void }) {
  const translate = useTranslations("Media");
  const format = useFormat();
  const router = useRouter();
  const confirmation = useConfirmation();
  const fields: FormField<MediaMetadataInput>[] = [
    { name: "title", type: "text", label: translate("fields.title"), maxLength: 200, wide: true },
    { name: "alt", type: "i18n", label: translate("fields.alt"), description: translate("fields.altHelp"), maxLength: 300, wide: true },
    { name: "caption", type: "i18n", label: translate("fields.caption"), maxLength: 500, multiline: true, wide: true },
    { name: "credit", type: "text", label: translate("fields.credit"), maxLength: 160, wide: true },
  ];
  return <Drawer opened={!!item} onClose={onClose} position="right" size="lg" title={translate("details")}>
    {item && <Stack gap="md">
      <AspectRatio ratio={item.width / item.height} style={{ backgroundColor: item.color, borderRadius: "var(--app-radius-card)", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin immutable rendition */}
        <img src={`/media/${item.id}/md`} alt="" />
      </AspectRatio>
      <DetailList items={[
        { label: translate("info.source"), value: translate(`sources.${item.source}`) },
        { label: translate("info.size"), value: `${item.width} × ${item.height} · ${format.bytes(item.bytes)}` },
        { label: translate("info.usage"), value: translate("info.usageCount", { count: item.usage }) },
        { label: translate("info.created"), value: `${format.dateTime(item.createdAt)}${item.createdBy ? ` · ${item.createdBy}` : ""}` },
        item.aiPrompt !== null && { label: translate("info.prompt"), value: item.aiPrompt },
      ]} />
      <AutoForm<MediaMetadataInput> key={item.id} fields={fields} schema={mediaMetadataInputSchema} disabled={!canManage} success={translate("saved")}
        initial={{ title: item.title, alt: item.alt, caption: item.caption, credit: item.credit }}
        onSubmit={(values) => updateMedia(item.id, values)} />
      {canManage && <Group justify="flex-end">
        <Button variant="subtle" color="red" leftSection={<Trash2 size={16} aria-hidden="true" />} onClick={() => confirmation.ask({
          title: translate("deleteTitle"), description: translate("deleteDescription"), confirmLabel: translate("delete"),
          run: () => deleteMedia(item.id), success: translate("deleted"), errors: { media_in_use: translate("errors.inUse", { count: item.usage }) },
          done: () => { onClose(); router.refresh(); },
        })}>{translate("delete")}</Button>
      </Group>}
      <Text size="xs" c="dimmed">{translate("renditions")}</Text>
      {confirmation.dialog}
    </Stack>}
  </Drawer>;
}
