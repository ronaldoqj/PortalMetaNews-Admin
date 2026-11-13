"use client";

import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { ArrowDown, ArrowUp, LayoutTemplate, Newspaper, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { resolveI18nString } from "../../i18n/i18n-string";
import { useRouter } from "../../i18n/navigation";
import { useApiAction } from "../shared/use-api-action";
import { ActionIcon, Button, FormActions, Notice, Section, Select } from "../ui";
import { saveFrontPage, searchPublishedNews } from "./actions";
import type { Category, FrontPage, Localized } from "./contracts";
import styles from "./newsroom.module.css";

export type PinnedNews = { id: string; title: Localized };

const LIMITS = { highlights: 4, sections: 8 } as const;

/**
 * The front page ("capa"): the headline, up to four highlights and the sections shown as blocks, in order. What is
 * left empty is filled by the site with the newest featured and the newest news, so the home page never waits.
 */
export function FrontPageEditor({ initial, pinned, categories, canManage }: {
  initial: FrontPage; pinned: readonly PinnedNews[]; categories: readonly Category[]; canManage: boolean;
}) {
  const translate = useTranslations("FrontPage");
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [known, setKnown] = useState<PinnedNews[]>([...pinned]);
  const save = useApiAction(saveFrontPage, { success: translate("saved"), errors: { front_page_unpublished: translate("errors.unpublished") } });
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const titleOf = (id: string) => resolveI18nString(known.find((item) => item.id === id)?.title, locale) || translate("unknown");
  const categoryName = (id: string) => resolveI18nString(categories.find((item) => item.id === id)?.name, locale) || translate("unknown");
  const remember = (item: PinnedNews) => setKnown((current) => (current.some((entry) => entry.id === item.id) ? current : [...current, item]));
  const used = [value.headline, ...value.highlights].filter((id): id is string => !!id);
  const move = <Key extends "highlights" | "sections">(key: Key, index: number, offset: number) => setValue((current) => {
    const list = [...current[key]];
    [list[index], list[index + offset]] = [list[index + offset], list[index]];
    return { ...current, [key]: list };
  });
  const drop = (key: "highlights" | "sections", id: string) => setValue((current) => ({ ...current, [key]: current[key].filter((item) => item !== id) }));
  async function submit() {
    const result = await save.run(value);
    if (result.ok) { setSaved(result.data); setValue(result.data); router.refresh(); }
  }
  const row = (key: "highlights" | "sections", id: string, index: number, total: number, label: string) => <Group key={id} justify="space-between" wrap="nowrap" gap="xs"
    py={6} style={index ? { borderTop: "1px solid var(--app-border)" } : undefined}>
    <Text size="sm" fw={500} lineClamp={1}>{index + 1}. {label}</Text>
    {canManage && <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" aria-label={translate("moveUp")} disabled={index === 0} onClick={() => move(key, index, -1)}><ArrowUp size={14} /></ActionIcon>
      <ActionIcon variant="subtle" color="gray" aria-label={translate("moveDown")} disabled={index === total - 1} onClick={() => move(key, index, 1)}><ArrowDown size={14} /></ActionIcon>
      <ActionIcon variant="subtle" color="red" aria-label={translate("remove")} onClick={() => drop(key, id)}><X size={14} /></ActionIcon>
    </Group>}
  </Group>;
  return <Stack gap="lg" component="form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <Notice tone="info" icon={LayoutTemplate}>{translate("automatic")}</Notice>
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Stack gap="lg">
        <Section title={translate("headline.title")} description={translate("headline.description")} icon={Star}>
          <NewsSearch label={translate("headline.pick")} value={value.headline} titleOf={titleOf} exclude={value.highlights} disabled={!canManage}
            onChange={(item) => { if (item) remember(item); setValue((current) => ({ ...current, headline: item?.id ?? null })); }} />
        </Section>
        <Section title={translate("highlights.title")} description={translate("highlights.description", { max: LIMITS.highlights })} icon={Newspaper}>
          <Stack gap="xs">
            {value.highlights.length ? <div>{value.highlights.map((id, index) => row("highlights", id, index, value.highlights.length, titleOf(id)))}</div>
              : <Text size="sm" c="dimmed">{translate("highlights.empty")}</Text>}
            {canManage && value.highlights.length < LIMITS.highlights && <NewsSearch key={value.highlights.join()} label={translate("highlights.add")} value={null}
              titleOf={titleOf} exclude={used} onChange={(item) => { if (!item) return; remember(item); setValue((current) => ({ ...current, highlights: [...current.highlights, item.id] })); }} />}
          </Stack>
        </Section>
        <Section title={translate("sections.title")} description={translate("sections.description", { max: LIMITS.sections })} icon={LayoutTemplate}>
          <Stack gap="xs">
            {value.sections.length ? <div>{value.sections.map((id, index) => row("sections", id, index, value.sections.length, categoryName(id)))}</div>
              : <Text size="sm" c="dimmed">{translate("sections.empty")}</Text>}
            {canManage && value.sections.length < LIMITS.sections && <Select key={value.sections.join()} placeholder={translate("sections.add")} aria-label={translate("sections.add")}
              data={categories.filter((category) => category.active && !value.sections.includes(category.id)).map((category) => ({ value: category.id, label: resolveI18nString(category.name, locale) }))}
              value={null} onChange={(id) => id && setValue((current) => ({ ...current, sections: [...current.sections, id] }))} />}
          </Stack>
        </Section>
      </Stack>
      <Section title={translate("preview.title")} description={translate("preview.description")}>
        <div className={styles.homePreview}>
          <div className={`${styles.homeSlot} ${styles.homeHeadline}`} data-filled={value.headline ? true : undefined}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">{translate("preview.headline")}</Text>
            <Text fw={700} size="lg" lineClamp={3}>{value.headline ? titleOf(value.headline) : translate("preview.auto")}</Text>
          </div>
          {Array.from({ length: LIMITS.highlights }, (_, index) => value.highlights[index]).slice(0, 2).map((id, index) => <div key={index} className={styles.homeSlot} data-filled={id ? true : undefined}>
            <Text size="sm" fw={600} lineClamp={2}>{id ? titleOf(id) : translate("preview.auto")}</Text>
          </div>)}
        </div>
        <SimpleGrid cols={2} spacing={8} mt={8}>
          {[2, 3].map((index) => <div key={index} className={styles.homeSlot} data-filled={value.highlights[index] ? true : undefined}>
            <Text size="sm" fw={600} lineClamp={2}>{value.highlights[index] ? titleOf(value.highlights[index]) : translate("preview.auto")}</Text>
          </div>)}
        </SimpleGrid>
        <Stack gap={6} mt="md">
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">{translate("preview.sections")}</Text>
          {(value.sections.length ? value.sections : []).map((id) => <div key={id} className={styles.homeSlot} data-filled><Text size="sm" fw={600}>{categoryName(id)}</Text></div>)}
          {!value.sections.length && <Text size="sm" c="dimmed">{translate("preview.sectionsAuto")}</Text>}
        </Stack>
      </Section>
    </SimpleGrid>
    {canManage && <FormActions dirty={dirty} pending={save.pending} onDiscard={() => setValue(saved)} submitLabel={translate("save")}>
      <Button type="button" variant="subtle" onClick={() => setValue({ headline: null, highlights: [], sections: [] })}>{translate("clear")}</Button>
    </FormActions>}
  </Stack>;
}

/** Searches published news by title as you type; the chosen item comes back with its title. */
function NewsSearch({ label, value, titleOf, exclude, disabled, onChange }: {
  label: string; value: string | null; titleOf: (id: string) => string; exclude: readonly string[]; disabled?: boolean; onChange: (item: PinnedNews | null) => void;
}) {
  const translate = useTranslations("FrontPage");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 250);
  const [found, setFound] = useState<PinnedNews[]>([]);
  useEffect(() => {
    let active = true;
    void searchPublishedNews(debounced).then((result) => { if (active && result.ok) setFound(result.data.items.map((item) => ({ id: item.id, title: item.title }))); });
    return () => { active = false; };
  }, [debounced]);
  const data = useMemo(() => {
    const options = found.filter((item) => !exclude.includes(item.id)).map((item) => ({ value: item.id, label: resolveI18nString(item.title, locale) || item.id }));
    return value && !options.some((option) => option.value === value) ? [{ value, label: titleOf(value) }, ...options] : options;
  }, [found, exclude, value, locale, titleOf]);
  return <Select aria-label={label} placeholder={label} data={data} value={value} searchable clearable disabled={disabled} nothingFoundMessage={translate("nothingFound")}
    onSearchChange={setSearch} filter={({ options }) => options}
    onChange={(id) => onChange(id ? { id, title: found.find((item) => item.id === id)?.title ?? { pt: titleOf(id) } } : null)} />;
}
