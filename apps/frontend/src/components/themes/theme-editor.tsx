"use client";

import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { CircleAlert, CircleCheck, Download, Globe, Info, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readableOn } from "../../theme/theme";
import {
  CARD_STYLES, HEADER_LAYOUTS, INPUT_SHAPES, INPUT_VARIANTS, PALETTE_FIELDS, RADIUS_OPTIONS, type Branding, type BrandingAssetUrls, type ColorScheme,
  type PaletteField,
} from "../../tokens/branding";
import { Button, FormActions, FormSection, Notice, Page, Select, StatusBadge, TextInput, Textarea, useApiAction } from "../ui";
import { ColorInput, SegmentedControl } from "../ui/forms/input";
import { activateTheme, updateTheme } from "./actions";
import type { Theme, ThemeSurface } from "./contracts";
import { contrastRatio } from "./preview-variables";
import { downloadThemeFile } from "./theme-download";
import { ThemePreview } from "./theme-preview";
import { TypographySelector } from "./typography-selector";
import styles from "./themes.module.css";

const SWATCHES = ["#0F3D91", "#E63946", "#141414", "#B91C1C", "#0E7490", "#D97706", "#F7F8FA", "#FFFFFF", "#0B1324", "#0A0F1A"];

/**
 * Every token of a theme beside a live miniature of the site: colours of both schemes (with the contrast of the text
 * against each background), fields, typography, corners and the site's header and card styles. Saving makes the change
 * visible on the next page of every surface that uses the theme.
 */
export function ThemeEditor({ theme, assets, siteName }: { theme: Theme; assets: Pick<BrandingAssetUrls, "logo" | "logoDark">; siteName: string }) {
  const t = useTranslations("Themes");
  const b = useTranslations("Branding");
  const router = useRouter();
  const [saved, setSaved] = useState(theme);
  const [name, setName] = useState(theme.name);
  const [description, setDescription] = useState(theme.description);
  const [tokens, setTokens] = useState<Branding>(theme.tokens);
  const [scheme, setScheme] = useState<ColorScheme>("light");
  const save = useApiAction(updateTheme, { success: t("editor.saved"), errors: t.raw("errors") as Record<string, string> });
  const activate = useApiAction(activateTheme);
  const dirty = name !== saved.name || description !== saved.description || JSON.stringify(tokens) !== JSON.stringify(saved.tokens);
  const palette = tokens[scheme];
  const setColor = (field: PaletteField, color: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) setTokens((current) => ({ ...current, [scheme]: { ...current[scheme], [field]: color.toUpperCase() } }));
  };

  async function submit() {
    const result = await save.run(theme.id, { name, description, tokens });
    if (result.ok) { setSaved(result.data); router.refresh(); }
  }
  async function activateOn(surface: ThemeSurface) {
    const result = await activate.run(theme.id, surface);
    if (result.ok) {
      setSaved((current) => ({ ...current, activeOn: [...new Set([...current.activeOn, surface])] }));
      router.refresh();
    }
  }
  const contrast = (field: PaletteField) => {
    const against = field === "foreground" || field === "muted" ? palette.background : field === "primary" || field === "secondary" ? readableOn(palette[field]) : palette.foreground;
    return contrastRatio(palette[field], against);
  };

  return <Page title={`${t("editor.title")}: ${saved.name}`} description={saved.description || undefined} actions={<Group gap="xs">
    <Button variant="default" leftSection={<Download size={16} aria-hidden="true" />} onClick={() => downloadThemeFile({ name, description, tokens })}>{t("actions.export")}</Button>
    {!saved.activeOn.includes("site") && <Button variant="light" leftSection={<Globe size={16} aria-hidden="true" />} loading={activate.pending} disabled={dirty} onClick={() => void activateOn("site")}>{t("actions.activateSite")}</Button>}
    {!saved.activeOn.includes("panel") && <Button variant="light" leftSection={<Monitor size={16} aria-hidden="true" />} loading={activate.pending} disabled={dirty} onClick={() => void activateOn("panel")}>{t("actions.activatePanel")}</Button>}
  </Group>}>
    <Group gap="xs">
      {saved.system && <StatusBadge tone="neutral">{t("system")}</StatusBadge>}
      {saved.activeOn.includes("site") && <StatusBadge tone="success">{t("activeSite")}</StatusBadge>}
      {saved.activeOn.includes("panel") && <StatusBadge tone="info">{t("activePanel")}</StatusBadge>}
    </Group>
    {saved.system && <Notice tone="info" icon={Info}>{t("editor.systemNotice")}</Notice>}
    {saved.activeOn.length > 0 && <Notice tone="warning">{t("editor.activeNotice", { surfaces: saved.activeOn.map((surface) => t(`editor.surfaces.${surface}`)).join(", ") })}</Notice>}
    <div className={styles.editorGrid}>
      <Stack gap="xl">
        <FormSection title={t("editor.identity")} description={t("editor.identityHint")} layout="stacked">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t("editor.name")} value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={80} required />
            <Textarea label={t("editor.descriptionField")} value={description} onChange={(event) => setDescription(event.currentTarget.value)} maxLength={300} autosize minRows={1} />
          </SimpleGrid>
        </FormSection>
        <FormSection title={t("editor.colors")} description={t("editor.colorsHint")} layout="stacked">
          <Stack gap="md">
            <SegmentedControl value={scheme} onChange={(value) => setScheme(value === "dark" ? "dark" : "light")} w="fit-content" aria-label={b("schemes.label")} data={[
              { value: "light", label: <Group gap={6} wrap="nowrap"><Sun size={15} aria-hidden="true" />{b("schemes.light")}</Group> },
              { value: "dark", label: <Group gap={6} wrap="nowrap"><Moon size={15} aria-hidden="true" />{b("schemes.dark")}</Group> },
            ]} />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {PALETTE_FIELDS.map((field) => {
                const ratio = contrast(field);
                const good = ratio >= 4.5 || field === "border" || field === "highlight" || field === "background" || field === "surface";
                return <Stack key={`${scheme}-${field}`} gap={4}>
                  <ColorInput label={b(`colors.${field}`)} description={b(`colorHints.${field}`)} format="hex" value={palette[field]} swatches={SWATCHES}
                    withEyeDropper={false} onChange={(color) => setColor(field, color)} />
                  {(field === "foreground" || field === "muted") && <span className={styles.colorHint} style={{ color: good ? "var(--mantine-color-teal-7)" : "var(--mantine-color-orange-7)" }}>
                    {good ? <CircleCheck size={13} aria-hidden="true" /> : <CircleAlert size={13} aria-hidden="true" />}
                    {good ? t("editor.contrast.good") : t("editor.contrast.low", { ratio: ratio.toFixed(1) })}
                  </span>}
                  {(field === "primary" || field === "secondary") && <Text size="xs" c="dimmed">{t("editor.onColor", { color: readableOn(palette[field]) === "#000000" ? "#000" : "#FFF" })}</Text>}
                </Stack>;
              })}
            </SimpleGrid>
          </Stack>
        </FormSection>
        <FormSection title={t("editor.fieldsTitle")} description={t("editor.fieldsHint")} layout="stacked">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select label={b("fields.variant.label")} allowDeselect={false} value={tokens.inputStyle.variant}
              data={INPUT_VARIANTS.map((variant) => ({ value: variant, label: b(`fields.variant.options.${variant}`) }))}
              onChange={(variant) => variant && setTokens((current) => ({ ...current, inputStyle: { ...current.inputStyle, variant: variant as Branding["inputStyle"]["variant"] } }))} />
            <Select label={b("fields.shape.label")} allowDeselect={false} value={tokens.inputStyle.shape}
              data={INPUT_SHAPES.map((shape) => ({ value: shape, label: b(`fields.shape.options.${shape}`) }))}
              onChange={(shape) => shape && setTokens((current) => ({ ...current, inputStyle: { ...current.inputStyle, shape: shape as Branding["inputStyle"]["shape"] } }))} />
          </SimpleGrid>
        </FormSection>
        <FormSection title={t("editor.typography")} description={t("editor.typographyHint")} layout="stacked">
          <TypographySelector value={tokens.typography} disabled={false} onChange={(typography) => setTokens((current) => ({ ...current, typography }))} />
        </FormSection>
        <FormSection title={t("editor.shapes")} description={t("editor.shapesHint")} layout="stacked">
          <Stack gap="md">
            <Stack gap={4}>
              <Text size="sm" fw={500}>{t("editor.radius")}</Text>
              <SegmentedControl value={tokens.radius} onChange={(radius) => setTokens((current) => ({ ...current, radius: radius as Branding["radius"] }))}
                data={RADIUS_OPTIONS.map((radius) => ({ value: radius, label: t(`editor.radiusOptions.${radius}`) }))} fullWidth />
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select label={t("editor.header")} allowDeselect={false} value={tokens.site.header}
                data={HEADER_LAYOUTS.map((header) => ({ value: header, label: t(`editor.headerOptions.${header}`) }))}
                onChange={(header) => header && setTokens((current) => ({ ...current, site: { ...current.site, header: header as Branding["site"]["header"] } }))} />
              <Select label={t("editor.cards")} allowDeselect={false} value={tokens.site.cards}
                data={CARD_STYLES.map((cards) => ({ value: cards, label: t(`editor.cardOptions.${cards}`) }))}
                onChange={(cards) => cards && setTokens((current) => ({ ...current, site: { ...current.site, cards: cards as Branding["site"]["cards"] } }))} />
            </SimpleGrid>
          </Stack>
        </FormSection>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <FormActions dirty={dirty} pending={save.pending} disabled={!name.trim()} submitLabel={t("actions.save")}
            onDiscard={() => { setName(saved.name); setDescription(saved.description); setTokens(saved.tokens); }} />
        </form>
      </Stack>
      <div className={styles.sticky}>
        <ThemePreview tokens={tokens} assets={assets} siteName={siteName} scheme={scheme} onSchemeChange={setScheme} />
      </div>
    </div>
  </Page>;
}
