"use client";

import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Card } from "../ui/card";
import { Select } from "../ui/forms/input";
import { Title } from "../ui/title";
import { FONT_OPTIONS, isFontOption, resolveFontFamily, type FontOption, type Typography } from "../../tokens/typography";

/**
 * The typeface of headings and that of body text and controls, each option drawn in its own font, with a sample that
 * follows the choice at once. The sample overrides Mantine's font variables locally, so it shows the theme being
 * edited, not the one rendering the panel.
 */
export function TypographySelector({ value, onChange, disabled }: { value: Typography; onChange: (value: Typography) => void; disabled: boolean }) {
  const t = useTranslations("Branding.typography");
  const data = FONT_OPTIONS.map((font) => ({ value: font, label: t(`fonts.${font}.name`) }));
  const select = (key: keyof Typography) => <Select
    label={t(key === "fontHeadings" ? "headings" : "body")} allowDeselect={false} disabled={disabled} value={value[key]} data={data}
    onChange={(font) => { if (isFontOption(font)) onChange({ ...value, [key]: font }); }}
    styles={{ input: { fontFamily: resolveFontFamily(value[key]) } }}
    renderOption={({ option, checked }) => isFontOption(option.value)
      ? <FontOptionPreview font={option.value} name={option.label} hint={t(`fonts.${option.value}.hint`)} checked={checked} />
      : option.label}
  />;
  const sample = {
    "--mantine-font-family": resolveFontFamily(value.fontBody), "--mantine-font-family-headings": resolveFontFamily(value.fontHeadings),
    fontFamily: "var(--mantine-font-family)",
  } as CSSProperties;
  return <Stack gap="sm">
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">{select("fontHeadings")}{select("fontBody")}</SimpleGrid>
    <Card withBorder radius="md" p="md" style={sample} aria-label={t("preview")} role="group">
      <Stack gap={6}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{t("preview")}</Text>
        <Title order={2}>{t("sampleTitle")}</Title>
        <Text size="sm">{t("sampleText")}</Text>
      </Stack>
    </Card>
  </Stack>;
}

/** An option set in its own typeface; the check is drawn here because a custom option replaces Mantine's. */
function FontOptionPreview({ font, name, hint, checked }: { font: FontOption; name: string; hint: string; checked?: boolean }) {
  return <Group justify="space-between" wrap="nowrap" gap="sm" w="100%">
    <Stack gap={0} miw={0}>
      <Text size="md" style={{ fontFamily: resolveFontFamily(font) }}>{name}</Text>
      <Text size="xs" c="dimmed">{hint}</Text>
    </Stack>
    {checked && <Check size={14} aria-hidden="true" style={{ flexShrink: 0 }} />}
  </Group>;
}
