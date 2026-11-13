"use client";

import { AspectRatio, Badge, Group, Loader, Progress, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { MIME_TYPES } from "@mantine/dropzone";
import { ImageUp, Sparkles, WandSparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { resolveI18nString } from "../../i18n/i18n-string";
import { uploadFile, type RelayError } from "../shared/file-transfer";
import { useApiErrorMessage } from "../shared/use-api-action";
import { Button, ListingView, Notice, Textarea, TextInput } from "../ui";
import { Dropzone } from "../ui/forms/dropzone";
import { generateMedia } from "./actions";
import { mediaItemSchema, type AiStatus, type MediaItem } from "./contracts";
import styles from "./newsroom.module.css";

export const MEDIA_ACCEPT = [MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.webp];

/** One image of the library as a tile: its smallest rendition over its dominant colour, an AI mark when generated. */
export function MediaTile({ item, selected = false, onClick, label }: { item: MediaItem; selected?: boolean; onClick?: () => void; label?: string }) {
  const translate = useTranslations("Media");
  const locale = useLocale();
  const alt = resolveI18nString(item.alt, locale);
  const content = <Stack gap={6}>
    <AspectRatio ratio={16 / 10} className={styles.tile} data-selected={selected || undefined} style={{ backgroundColor: item.color }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin immutable renditions, already sized */}
      <img src={`/media/${item.id}/sm`} alt={alt} loading="lazy" decoding="async" />
    </AspectRatio>
    <Group gap={6} wrap="nowrap" justify="space-between">
      <Text size="xs" fw={600} truncate="end">{item.title || alt || translate("untitled")}</Text>
      {item.source === "ai" && <Badge size="xs" variant="light" color="grape" leftSection={<Sparkles size={10} aria-hidden="true" />}>{translate("ai")}</Badge>}
    </Group>
  </Stack>;
  return onClick ? <UnstyledButton onClick={onClick} aria-pressed={selected} aria-label={label ?? (item.title || alt)} className={styles.tileButton}>{content}</UnstyledButton> : content;
}

export function MediaGrid({ items, selectedId, onSelect }: { items: readonly MediaItem[]; selectedId?: string | null; onSelect: (item: MediaItem) => void }) {
  // The tiles come in one after the other (`ListingView`), like every list of the panel.
  return <ListingView view="grid"><SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
    {items.map((item) => <MediaTile key={item.id} item={item} selected={item.id === selectedId} onClick={() => onSelect(item)} />)}
  </SimpleGrid></ListingView>;
}

/** Sends one image to the library through the panel's relay, with its description in both languages. */
export async function uploadMedia(locale: string, file: File, metadata: { title?: string; alt?: Record<string, string>; credit?: string },
  onProgress?: (fraction: number) => void): Promise<{ data?: MediaItem; error?: RelayError | "unavailable"; code?: string }> {
  const result = await uploadFile(`/${locale}/api/panel/media`, file, {
    fields: { title: metadata.title, alt: metadata.alt ? JSON.stringify(metadata.alt) : undefined, credit: metadata.credit }, onProgress,
  });
  if (result.error) return { error: result.error, code: result.code };
  const parsed = mediaItemSchema.safeParse(result.data);
  return parsed.success ? { data: parsed.data } : { error: "unavailable" };
}

/** Drop or choose images; each one is uploaded at once and handed back. */
export function MediaUploader({ onUploaded }: { onUploaded: (item: MediaItem) => void }) {
  const translate = useTranslations("Media");
  const locale = useLocale();
  const message = useApiErrorMessage();
  const [progress, setProgress] = useState<number | null>(null);
  const [credit, setCredit] = useState("");
  const [error, setError] = useState<string>();
  async function send(files: File[]) {
    setError(undefined);
    for (const file of files) {
      setProgress(0);
      const result = await uploadMedia(locale, file, { title: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 200), credit: credit.trim() || undefined }, setProgress);
      setProgress(null);
      if (result.data) onUploaded(result.data);
      else setError(message({ error: result.error === "aborted" ? "unavailable" : result.error ?? "unavailable", code: result.code }, {
        tooLarge: translate("errors.tooLarge"), unsupportedType: translate("errors.unsupportedType"),
      }));
    }
  }
  return <Stack gap="sm">
    <TextInput label={translate("credit")} description={translate("creditHelp")} value={credit} onChange={(event) => setCredit(event.currentTarget.value)} maxLength={160} />
    <Dropzone onDrop={(files) => void send(files)} accept={MEDIA_ACCEPT} multiple loading={progress !== null} radius="md">
      <Stack align="center" gap={6} py="lg" style={{ pointerEvents: "none" }}>
        <ImageUp size={32} aria-hidden="true" />
        <Text fw={600}>{translate("dropTitle")}</Text>
        <Text size="sm" c="dimmed" ta="center">{translate("dropHint")}</Text>
      </Stack>
    </Dropzone>
    {progress !== null && <Progress value={progress * 100} animated aria-label={translate("uploading")} />}
    {error && <Notice tone="danger">{error}</Notice>}
  </Stack>;
}

/** Describes an image and lets the AI draw it; the result joins the library like an upload, marked as generated. */
export function MediaGenerator({ ai, onGenerated, initialPrompt = "" }: { ai: AiStatus | null; onGenerated: (item: MediaItem) => void; initialPrompt?: string }) {
  const translate = useTranslations("Media");
  const message = useApiErrorMessage();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  if (!ai?.images) return <Notice tone="warning">{translate("aiUnavailable")}</Notice>;
  async function generate() {
    setPending(true);
    setError(undefined);
    const result = await generateMedia({ prompt }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setPending(false);
    if (result.ok) { onGenerated(result.data); setPrompt(""); } else setError(message(result, { ai_images_unavailable: translate("aiUnavailable") }));
  }
  return <Stack gap="sm">
    {!ai.generative && <Notice tone="info">{translate("aiSimulated")}</Notice>}
    <Textarea label={translate("prompt")} description={translate("promptHelp")} value={prompt} onChange={(event) => setPrompt(event.currentTarget.value)}
      autosize minRows={3} maxLength={1000} disabled={pending} />
    <Group justify="flex-end">
      {pending && <Group gap="xs"><Loader size="xs" /><Text size="sm" c="dimmed">{translate("generating")}</Text></Group>}
      <Button onClick={() => void generate()} loading={pending} disabled={prompt.trim().length < 3} leftSection={<WandSparkles size={16} aria-hidden="true" />}>
        {translate("generate")}
      </Button>
    </Group>
    {error && <Notice tone="danger">{error}</Notice>}
  </Stack>;
}
