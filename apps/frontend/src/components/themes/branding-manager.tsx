"use client";

import { Group, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ImageUp, Info, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRANDING_ASSET_SLOTS, bundledAssets, type BrandingAssetSlot, type BrandingAssets } from "../../tokens/branding";
import { uploadFile } from "../shared/file-transfer";
import { ActionIcon, Card, Notice, Tooltip, useConfirmation } from "../ui";
import { Dropzone } from "../ui/forms/dropzone";
import { removeBrandImage } from "./actions";
import styles from "./themes.module.css";

/** Mirrors the API limits for brand images. The API detects the real type from the file's bytes and rebuilds every image. */
export const BRAND_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BRAND_IMAGE_ACCEPT = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] };
const ERRORS = ["tooLarge", "unsupportedType", "invalidInput", "forbidden", "unavailable"] as const;
type BrandError = (typeof ERRORS)[number];

export function brandImageError(file: { size: number; type: string }): BrandError | undefined {
  if (!(file.type in BRAND_IMAGE_ACCEPT)) return "unsupportedType";
  if (file.size <= 0) return "invalidInput";
  if (file.size > BRAND_IMAGE_MAX_BYTES) return "tooLarge";
  return undefined;
}

/** The same-origin upload relay of a slot, under the locale prefix of the panel's session cookie. */
export const brandImageRoute = (locale: string, slot: BrandingAssetSlot) => `/${encodeURIComponent(locale)}/api/panel/site-assets/${slot}`;

/**
 * The portal's five brand images, each uploaded as soon as it is chosen (with progress) and removable back to the
 * bundled identity. Logos and favicons are pairs: one uploaded image of a pair serves both schemes until the other is.
 */
export function BrandingManager({ assets }: { assets: BrandingAssets }) {
  const t = useTranslations("Branding.assets");
  return <Stack gap="lg">
    <Notice tone="info" icon={Info}>{t("metadata")}</Notice>
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      {BRANDING_ASSET_SLOTS.map((slot) => <BrandImageSlot key={slot} slot={slot} file={assets[slot]} />)}
    </SimpleGrid>
  </Stack>;
}

function BrandImageSlot({ slot, file }: { slot: BrandingAssetSlot; file: string | null }) {
  const t = useTranslations("Branding.assets");
  const locale = useLocale();
  const router = useRouter();
  const confirmation = useConfirmation();
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<BrandError>();
  const label = t(`slots.${slot}.label`);
  const current = file ? `/brand-assets/${file}` : undefined;

  async function upload(chosen: File) {
    const invalid = brandImageError(chosen);
    setError(invalid);
    if (invalid) return;
    setProgress(0);
    const result = await uploadFile(brandImageRoute(locale, slot), chosen, { onProgress: setProgress });
    setProgress(undefined);
    if (result.error) {
      setError((ERRORS as readonly string[]).includes(result.error) ? result.error as BrandError : "unavailable");
      return;
    }
    notifications.show({ message: t("uploaded"), color: "teal" });
    router.refresh();
  }

  return <Card withBorder radius="md" p="md">
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <div>
          <Text fw={600}>{label}</Text>
          <Text size="xs" c="dimmed">{t(`slots.${slot}.hint`)}</Text>
        </div>
        {current && <Tooltip label={t("remove")}>
          <ActionIcon variant="subtle" color="red" aria-label={`${t("remove")}: ${label}`} onClick={() => confirmation.ask({
            title: t("removeTitle"), description: t("removeDescription", { name: label }), tone: "danger", confirmLabel: t("remove"),
            run: () => removeBrandImage(slot), success: t("removed"), done: () => router.refresh(),
          })}><Trash2 size={16} aria-hidden="true" /></ActionIcon>
        </Tooltip>}
      </Group>
      <div className={styles.slotPreview} data-slot={slot} data-scheme={slot === "logoDark" || slot === "faviconDark" ? "dark" : "light"}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin brand images at their natural size */}
        {current ? <img src={current} alt={label} /> : <img src={bundledAssets[slot]} alt="" data-fallback="" />}
      </div>
      <Text size="xs" c="dimmed">{current ? t("current") : t("bundled")}</Text>
      {progress !== undefined && <Stack gap={4}><Text size="xs">{t("uploading")}</Text><Progress value={progress * 100} size="sm" animated /></Stack>}
      {error && <Text size="xs" c="red" role="alert">{t(`errors.${error}`)}</Text>}
      <Dropzone onDrop={([chosen]) => chosen && void upload(chosen)} multiple={false} maxSize={BRAND_IMAGE_MAX_BYTES} accept={BRAND_IMAGE_ACCEPT}
        disabled={progress !== undefined} aria-label={`${current ? t("replace") : t("upload")}: ${label}`} radius="sm" p="sm"
        onReject={([rejection]) => setError(rejection?.errors[0]?.code === "file-too-large" ? "tooLarge" : "unsupportedType")}>
        <Group justify="center" gap="xs" wrap="nowrap" style={{ pointerEvents: "none" }}>
          <ImageUp size={18} aria-hidden="true" />
          <Text size="sm">{t("drop")}</Text>
        </Group>
      </Dropzone>
    </Stack>
    {confirmation.dialog}
  </Card>;
}
