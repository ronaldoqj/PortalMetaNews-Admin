"use client";

import { Group, Stack } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { resolveI18nString } from "../../i18n/i18n-string";
import { useApiAction } from "../shared/use-api-action";
import { Button, MultiSelect } from "../ui";
import { createTag, searchTags } from "./actions";
import type { Tag } from "./contracts";

type Option = Pick<Tag, "id" | "name">;

/** The item's tags: search the existing ones as you type, or create the one typed (named alike in both languages). */
export function TagPicker({ value, initial, onChange, canCreate, disabled }: {
  value: string[]; initial: readonly Option[]; onChange: (ids: string[], options: Option[]) => void; canCreate: boolean; disabled?: boolean;
}) {
  const translate = useTranslations("Builder.tags");
  const locale = useLocale();
  const [known, setKnown] = useState<Option[]>([...initial]);
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 250);
  const create = useApiAction(createTag, { success: translate("created") });
  useEffect(() => {
    let active = true;
    void searchTags(debounced).then((result) => {
      if (!active || !result.ok) return;
      setKnown((current) => [...current, ...result.data.filter((tag) => !current.some((item) => item.id === tag.id))]);
    });
    return () => { active = false; };
  }, [debounced]);
  const data = useMemo(() => known.map((tag) => ({ value: tag.id, label: resolveI18nString(tag.name, locale) })), [known, locale]);
  const typed = search.trim();
  const exists = data.some((option) => option.label.toLowerCase() === typed.toLowerCase());
  async function add() {
    const result = await create.run({ pt: typed, en: "" });
    if (!result.ok) return;
    const next = [...known.filter((tag) => tag.id !== result.data.id), result.data];
    setKnown(next);
    setSearch("");
    onChange([...value, result.data.id], next);
  }
  return <Stack gap={6}>
    <MultiSelect label={translate("label")} placeholder={value.length ? undefined : translate("placeholder")} data={data} value={value} searchable
      searchValue={search} onSearchChange={setSearch} disabled={disabled} maxValues={15} hidePickedOptions nothingFoundMessage={translate("none")}
      onChange={(ids) => onChange(ids, known)} />
    {canCreate && typed.length >= 2 && !exists && !disabled && <Group>
      <Button size="compact-xs" variant="subtle" leftSection={<Plus size={12} aria-hidden="true" />} loading={create.pending} onClick={() => void add()}>
        {translate("create", { name: typed })}
      </Button>
    </Group>}
  </Stack>;
}
