"use client";

import { FileButton, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Copy, Download, Globe, Monitor, Palette, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { useRouter as useLocalizedRouter } from "../../i18n/navigation";
import { resolveFontFamily } from "../../tokens/typography";
import { Button, DataView, EmptyState, FormModal, Modal, Section, StatusBadge, TextInput, useApiAction, useConfirmation, useFormat, useListingView, type Column } from "../ui";
import { activateTheme, createTheme, deleteTheme, duplicateTheme } from "./actions";
import type { Theme, ThemeList as ThemeListData, ThemeSurface } from "./contracts";
import { RADIUS_LENGTHS } from "./preview-variables";
import { downloadThemeFile } from "./theme-download";
import { parseThemeFile, type ThemeFile } from "./theme-file";
import styles from "./themes.module.css";

/**
 * Every theme as a card: both schemes' colours, the headings typeface and the corners at a glance, where it is active,
 * and what can be done with it (edit, duplicate, activate on the site or the panel, export, delete). New themes come
 * from a base theme or from an imported file.
 */
export function ThemeList({ data }: { data: ThemeListData }) {
  const t = useTranslations("Themes");
  const router = useRouter();
  const format = useFormat();
  const confirmation = useConfirmation();
  const errors = t.raw("errors") as Record<string, string>;
  const activate = useApiAction(activateTheme, { errors });
  const [duplicating, setDuplicating] = useState<Theme | "new">();
  const [importing, setImporting] = useState<ThemeFile>();
  const [importError, setImportError] = useState<string>();
  const localized = useLocalizedRouter();
  const fonts = useTranslations("Branding.typography");
  const listView = useListingView("themes");
  const columns: Column<Theme>[] = [
    { key: "preview", header: t("columns.preview"), card: "cover", width: 220, visibleFrom: "sm", render: (theme) => <ThemeSwatches theme={theme} /> },
    { key: "name", header: t("columns.name"), card: "title", render: (theme) => <Stack gap={2} miw={0}>
      <Text fw={600}>{theme.name}</Text>
      {theme.description && <Text size="sm" c="dimmed" lineClamp={2}>{theme.description}</Text>}
    </Stack> },
    { key: "status", header: t("columns.status"), card: "aside", render: (theme) => <Group gap={6}>
      {theme.system && <StatusBadge tone="neutral">{t("system")}</StatusBadge>}
      {theme.activeOn.includes("site") && <StatusBadge tone="success">{t("activeSite")}</StatusBadge>}
      {theme.activeOn.includes("panel") && <StatusBadge tone="info">{t("activePanel")}</StatusBadge>}
      {!theme.system && theme.activeOn.length === 0 && <Text size="sm" c="dimmed">—</Text>}
    </Group> },
    { key: "fonts", header: t("columns.fonts"), visibleFrom: "md", render: (theme) => <Text size="sm">{fonts(`fonts.${theme.tokens.typography.fontHeadings}.name`)} / {fonts(`fonts.${theme.tokens.typography.fontBody}.name`)}</Text> },
    { key: "updated", header: t("columns.updated"), visibleFrom: "lg", render: (theme) => <Text size="sm" c="dimmed">{theme.updatedBy
      ? t("updatedBy", { date: format.relative(theme.updatedAt), name: theme.updatedBy }) : t("updated", { date: format.relative(theme.updatedAt) })}</Text> },
  ];

  async function activateOn(theme: Theme, surface: ThemeSurface) {
    const result = await activate.run(theme.id, surface);
    if (result.ok) { notifications.show({ message: t(`activated.${surface}`), color: "teal" }); router.refresh(); }
  }
  async function read(file: File | null) {
    setImportError(undefined);
    if (!file) return;
    const parsed = parseThemeFile(await file.text(), file.name);
    if (parsed.ok) setImporting(parsed.theme);
    else setImportError(t(`import.${parsed.error}`));
  }

  return <Stack gap="lg">
    <Group justify="space-between" align="flex-start">
      <Text c="dimmed" maw={760}>{t("description")}</Text>
      <Group gap="xs">
        <FileButton onChange={(file) => void read(file)} accept="application/json,.json">
          {(props) => <Button {...props} variant="default" leftSection={<Upload size={16} aria-hidden="true" />}>{t("actions.import")}</Button>}
        </FileButton>
        <Button leftSection={<Plus size={16} aria-hidden="true" />} onClick={() => setDuplicating("new")}>{t("actions.new")}</Button>
      </Group>
    </Group>
    {importError && <Text c="red" size="sm" role="alert">{importError}</Text>}
    <Section title={t("listTitle")} icon={Palette} flush actions={data.items.length > 0 && listView.toggle}>
      <DataView rows={data.items} columns={columns} rowKey={(theme) => theme.id} view={listView.view} minWidth={720}
        onOpen={(theme) => localized.push({ pathname: "/panel/themes/[id]", params: { id: theme.id } })}
        empty={<EmptyState plain icon={Palette} title={t("empty")} />}
        actions={(theme) => [
          { label: t("actions.edit"), icon: Pencil, href: { pathname: "/panel/themes/[id]", params: { id: theme.id } } },
          { label: t("actions.duplicate"), icon: Copy, onClick: () => setDuplicating(theme) },
          { label: t("actions.export"), icon: Download, onClick: () => downloadThemeFile(theme) },
          { label: t("actions.activateSite"), icon: Globe, onClick: () => void activateOn(theme, "site"), hidden: theme.activeOn.includes("site"), disabled: activate.pending },
          { label: t("actions.activatePanel"), icon: Monitor, onClick: () => void activateOn(theme, "panel"), hidden: theme.activeOn.includes("panel"), disabled: activate.pending },
          { label: t("actions.delete"), icon: Trash2, tone: "danger", hidden: theme.system || theme.activeOn.length > 0, onClick: () => confirmation.ask({
            title: t("remove.title"), description: t("remove.description", { name: theme.name }), tone: "danger", confirmLabel: t("actions.delete"),
            run: () => deleteTheme(theme.id), success: t("remove.done"), errors, done: () => router.refresh(),
          }) },
        ]} />
    </Section>
    <DuplicateTheme themes={data.items} source={duplicating} onClose={() => setDuplicating(undefined)} />
    <ImportTheme theme={importing} onClose={() => setImporting(undefined)} />
    {confirmation.dialog}
  </Stack>;
}

/** Both schemes side by side: background, the headings typeface, the main colours and the corner radius. */
export function ThemeSwatches({ theme }: { theme: Pick<Theme, "tokens"> }) {
  const { tokens } = theme;
  return <div className={styles.swatches} aria-hidden="true">
    {(["light", "dark"] as const).map((scheme) => {
      const palette = tokens[scheme];
      return <div key={scheme} className={styles.scheme} style={{ background: palette.background, color: palette.foreground }}>
        <span className={styles.sample} style={{ fontFamily: resolveFontFamily(tokens.typography.fontHeadings) }}>Aa</span>
        <div className={styles.dots}>
          {[palette.primary, palette.secondary, palette.surface, palette.foreground, palette.muted].map((color, index) =>
            <span key={index} className={styles.dot} style={{ background: color }} />)}
        </div>
        <span className={styles.cornerSample} style={{ borderRadius: RADIUS_LENGTHS[tokens.radius], borderColor: palette.primary } as CSSProperties} />
      </div>;
    })}
  </div>;
}

/** A new theme from an existing one (its tokens copied), named by the editor. */
function DuplicateTheme({ themes, source, onClose }: { themes: Theme[]; source?: Theme | "new"; onClose: () => void }) {
  const t = useTranslations("Themes");
  const router = useLocalizedRouter();
  const base = source === "new" ? themes.find((theme) => theme.activeOn.includes("site")) ?? themes[0] : source;
  if (!source || !base) return null;
  return <FormModal opened onClose={onClose} title={source === "new" ? t("create.title") : t("duplicate.title")} size="md"
    initial={{ name: t("duplicate.copyOf", { name: base.name }), from: base.id }}
    fields={[
      { name: "name", type: "text", label: t("duplicate.name"), required: true, maxLength: 80 },
      ...(source === "new" ? [{ name: "from" as const, type: "select" as const, label: t("create.base"), required: true, description: t("create.description"),
        options: themes.map((theme) => ({ value: theme.id, label: theme.name })) }] : []),
    ]}
    success={source === "new" ? t("create.done") : t("duplicate.done")}
    onSubmit={async (values) => {
      const result = await duplicateTheme(values);
      if (result.ok) router.push({ pathname: "/panel/themes/[id]", params: { id: result.data.id } });
      return result;
    }} />;
}

/** A validated theme file, named before it becomes a theme. */
function ImportTheme({ theme, onClose }: { theme?: ThemeFile; onClose: () => void }) {
  const t = useTranslations("Themes");
  const router = useRouter();
  const [name, setName] = useState("");
  const create = useApiAction(createTheme, { success: t("import.done"), errors: t.raw("errors") as Record<string, string> });
  if (!theme) return null;
  return <Modal opened onClose={onClose} title={t("import.title")} size="md" centered>
    <Stack gap="md">
      <Text size="sm" c="dimmed">{t("import.description")}</Text>
      <ThemeSwatches theme={theme} />
      <TextInput label={t("import.name")} defaultValue={theme.name} maxLength={80} required onChange={(event) => setName(event.currentTarget.value)} />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>{t("actions.back")}</Button>
        <Button loading={create.pending} onClick={async () => {
          const result = await create.run({ name: (name || theme.name).trim(), description: theme.description, tokens: theme.tokens });
          if (result.ok) { onClose(); router.refresh(); }
        }}>{t("actions.import")}</Button>
      </Group>
    </Stack>
  </Modal>;
}

