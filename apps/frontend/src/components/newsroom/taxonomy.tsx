"use client";

import { ColorSwatch, Group, Stack, Text } from "@mantine/core";
import { FolderTree, Tags as TagsIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { resolveI18nString } from "../../i18n/i18n-string";
import { EmptyState, FilterBar, Pager, ResourceManager, SearchField, StatusBadge, type FormField } from "../ui";
import { removeCategory, removeTag, reorderCategories, saveCategory, saveTag } from "./actions";
import { CATEGORY_COLORS, categoryInputSchema, tagInputSchema, type Category, type CategoryInput, type Tag, type TagInput } from "./contracts";

/** The sections (editorias): the site's menu and the home page's blocks follow their order. */
export function CategoryManager({ items, canManage }: { items: readonly Category[]; canManage: boolean }) {
  const translate = useTranslations("Categories");
  const locale = useLocale();
  const fields: FormField<CategoryInput>[] = [
    { name: "name", type: "i18n", label: translate("fields.name"), maxLength: 80, required: true, wide: true },
    { name: "description", type: "i18n", label: translate("fields.description"), maxLength: 300, multiline: true, wide: true },
    { name: "color", type: "color", label: translate("fields.color"), colors: CATEGORY_COLORS },
    { name: "slugPt", type: "text", label: translate("fields.slugPt"), description: translate("fields.slugHelp"), maxLength: 160 },
    { name: "slugEn", type: "text", label: translate("fields.slugEn"), description: translate("fields.slugHelp"), maxLength: 160 },
    { name: "active", type: "switch", label: translate("fields.active"), description: translate("fields.activeHelp") },
    { name: "showInMenu", type: "switch", label: translate("fields.showInMenu"), description: translate("fields.showInMenuHelp") },
  ];
  return <ResourceManager<Category, CategoryInput> title={translate("listTitle")} description={translate("listDescription")} icon={FolderTree} items={items}
    canManage={canManage} fields={fields} schema={categoryInputSchema}
    blank={{ name: { pt: "", en: "" }, description: {}, color: "blue", active: true, showInMenu: true, slugPt: "", slugEn: "" }}
    toValues={(item) => ({ name: item.name, description: item.description, color: (CATEGORY_COLORS as readonly string[]).includes(item.color) ? item.color as CategoryInput["color"] : "blue",
      active: item.active, showInMenu: item.showInMenu, slugPt: item.slug.pt, slugEn: item.slug.en })}
    columns={[
      { key: "name", header: translate("columns.name"), render: (item) => <Group gap="sm" wrap="nowrap">
        <ColorSwatch size={14} color={`var(--mantine-color-${item.color}-6)`} withShadow={false} />
        <Stack gap={0}><Text size="sm" fw={600}>{resolveI18nString(item.name, locale)}</Text>
          <Text size="xs" c="dimmed">/{item.slug.pt} · /{item.slug.en}</Text></Stack>
      </Group> },
      { key: "state", header: translate("columns.state"), render: (item) => <Group gap={4}>
        <StatusBadge tone={item.active ? "success" : "neutral"}>{translate(item.active ? "active" : "inactive")}</StatusBadge>
        {item.showInMenu && item.active && <StatusBadge tone="info">{translate("inMenu")}</StatusBadge>}
      </Group> },
      { key: "news", header: translate("columns.news"), align: "right", render: (item) => <Text size="sm">{item.news ?? 0}</Text>, width: 100 },
    ]}
    labels={{ add: translate("add"), edit: translate("edit"), removeTitle: translate("removeTitle"),
      removeDescription: (item) => translate("removeDescription", { name: resolveI18nString(item.name, locale) }), saved: translate("saved"), removed: translate("removed") }}
    save={(id, values) => saveCategory(id, values)} remove={(id) => removeCategory(id)} reorder={(ids) => reorderCategories(ids)}
    removable={(item) => !item.news}
    empty={<EmptyState icon={FolderTree} title={translate("empty")} description={translate("emptyHint")} plain />} />;
}

/** The free subjects of the news, in both languages; a removed tag leaves the news it marked. */
export function TagManager({ items, total, pageSize, canManage }: { items: readonly Tag[]; total: number; pageSize: number; canManage: boolean }) {
  const translate = useTranslations("Tags");
  const locale = useLocale();
  const fields: FormField<TagInput>[] = [
    { name: "name", type: "i18n", label: translate("fields.name"), maxLength: 60, required: true, wide: true },
    { name: "slugPt", type: "text", label: translate("fields.slugPt"), description: translate("fields.slugHelp"), maxLength: 160 },
    { name: "slugEn", type: "text", label: translate("fields.slugEn"), description: translate("fields.slugHelp"), maxLength: 160 },
  ];
  return <Stack gap="md">
    <FilterBar><SearchField label={translate("search")} /></FilterBar>
    <ResourceManager<Tag, TagInput> title={translate("listTitle")} description={translate("listDescription")} icon={TagsIcon} items={items} canManage={canManage}
      fields={fields} schema={tagInputSchema} blank={{ name: { pt: "", en: "" }, slugPt: "", slugEn: "" }}
      toValues={(item) => ({ name: item.name, slugPt: item.slug.pt, slugEn: item.slug.en })}
      columns={[
        { key: "name", header: translate("columns.name"), render: (item) => <Stack gap={0}>
          <Text size="sm" fw={600}>{resolveI18nString(item.name, locale)}</Text>
          <Text size="xs" c="dimmed">{[item.name.pt, item.name.en].filter(Boolean).join(" · ")}</Text>
        </Stack> },
        { key: "slug", header: translate("columns.slug"), visibleFrom: "sm", render: (item) => <Text size="xs" c="dimmed">/{item.slug.pt} · /{item.slug.en}</Text> },
        { key: "news", header: translate("columns.news"), align: "right", render: (item) => <Text size="sm">{item.news ?? 0}</Text>, width: 100 },
      ]}
      labels={{ add: translate("add"), edit: translate("edit"), removeTitle: translate("removeTitle"),
        removeDescription: (item) => translate("removeDescription", { name: resolveI18nString(item.name, locale), count: item.news ?? 0 }), saved: translate("saved"), removed: translate("removed") }}
      save={(id, values) => saveTag(id, values)} remove={(id) => removeTag(id)}
      empty={<EmptyState icon={TagsIcon} title={translate("empty")} description={translate("emptyHint")} plain />} />
    <Pager total={total} pageSize={pageSize} label={translate("count", { count: total })} />
  </Stack>;
}
