"use client";

import { AspectRatio, Anchor, Group, Stack, Text } from "@mantine/core";
import { Archive, CalendarClock, ExternalLink, ImagePlus, RotateCcw, Send, Sparkles, Trash2, Undo2, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { resolveI18nString } from "../../i18n/i18n-string";
import { CONTENT_LOCALES } from "../../i18n/locales";
import { getPathname, Link } from "../../i18n/navigation";
import { Button, Checkbox, DetailList, Modal, Section, Select, Switch, TextInput, useFormat } from "../ui";
import { missingFor, type BuilderState } from "./builder-state";
import type { Author, Category, MediaBrief, NewsAction, NewsView } from "./contracts";
import { AiBadge, NewsStatusBadge } from "./status";
import { workflowActions } from "./workflow";
import { TagPicker } from "./tag-picker";
import styles from "./newsroom.module.css";

type TagOption = { id: string; name: Record<string, string | undefined> };

const ACTION_ICONS = { submit: Send, return: Undo2, publish: Upload, schedule: CalendarClock, unpublish: Undo2, archive: Archive, restore: RotateCcw } as const;

/** The builder's right column: publication, languages, classification, cover and highlights. */
export function BuilderSidebar({ view, state, editable, categories, authors, tags, cover, siteOrigin, can, busy, onChange, onTags, onAction, onDelete, onPickCover }: {
  view: NewsView; state: BuilderState; editable: boolean; categories: readonly Category[]; authors: readonly Author[]; tags: readonly TagOption[];
  cover: MediaBrief | null; siteOrigin: string; can: { editAll: boolean; createTags: boolean; ai: boolean }; busy: boolean;
  onChange: (patch: Partial<BuilderState>) => void; onTags: (ids: string[], options: TagOption[]) => void;
  onAction: (action: NewsAction, scheduledAt?: string) => void; onDelete: () => void; onPickCover: () => void;
}) {
  const translate = useTranslations("Builder");
  const status = useTranslations("News.actions");
  const locale = useLocale();
  const format = useFormat();
  /** The schedule dialog's starting value while it is open (read from the clock when the button is clicked). */
  const [scheduling, setScheduling] = useState<string | null>(null);
  const actions = workflowActions(view);
  const live = view.status === "published";
  return <>
    <Section title={translate("publication.title")}>
      <Stack gap="sm">
        <Group gap="xs"><NewsStatusBadge status={view.status} />{view.aiAssisted && <AiBadge />}</Group>
        <DetailList columns={1} items={[
          !!view.publishedAt && { label: translate("publication.publishedAt"), value: format.dateTime(view.publishedAt!) },
          !!view.scheduledAt && { label: translate("publication.scheduledAt"), value: format.dateTime(view.scheduledAt!) },
          { label: translate("publication.updatedAt"), value: `${format.dateTime(view.updatedAt)}${view.updatedBy ? ` · ${view.updatedBy}` : ""}` },
          { label: translate("publication.views"), value: format.number(view.views) },
          Object.keys(view.readingMinutes).length > 0 && { label: translate("publication.reading"), value: CONTENT_LOCALES.filter((item) => view.readingMinutes[item])
            .map((item) => translate("publication.minutes", { locale: item.toUpperCase(), count: view.readingMinutes[item] ?? 0 })).join(" · ") },
        ]} />
        {actions.length > 0 && <Stack gap={6}>
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action];
            const primary = action === "publish" || (action === "submit" && !view.permissions.publish);
            return <Button key={action} fullWidth variant={primary ? "filled" : "default"} leftSection={<Icon size={16} aria-hidden="true" />} disabled={busy}
              color={action === "archive" || action === "unpublish" ? "red" : undefined}
              onClick={() => (action === "schedule" ? setScheduling(localValue(view.scheduledAt, Date.now())) : onAction(action))}>{status(action)}</Button>;
          })}
        </Stack>}
        {live && <Stack gap={4}>
          {view.locales.filter((item) => view.slug[item]).map((item) => <Anchor key={item} size="sm" target="_blank" rel="noopener noreferrer"
            href={`${siteOrigin}${getPathname({ locale: item, href: { pathname: "/site/news/[slug]", params: { slug: view.slug[item]! } } })}`}>
            <Group gap={4} component="span"><ExternalLink size={14} aria-hidden="true" />{translate("publication.viewOnSite", { locale: item.toUpperCase() })}</Group>
          </Anchor>)}
        </Stack>}
        {view.permissions.delete && <Button variant="subtle" color="red" size="xs" leftSection={<Trash2 size={14} aria-hidden="true" />} onClick={onDelete}>{translate("delete")}</Button>}
      </Stack>
    </Section>

    <Section title={translate("languages.title")} description={translate("languages.description")}>
      <Stack gap="xs">
        {CONTENT_LOCALES.map((item) => {
          const missing = missingFor(state, item);
          return <Stack key={item} gap={2}>
            <Checkbox label={translate(`languages.${item}`)} checked={state.locales.includes(item)} disabled={!editable}
              onChange={(event) => onChange({ locales: event.currentTarget.checked ? CONTENT_LOCALES.filter((value) => value === item || state.locales.includes(value))
                : state.locales.filter((value) => value !== item) })} />
            {missing.length > 0 && <Text size="xs" c={state.locales.includes(item) ? "orange" : "dimmed"} pl={28}>
              {translate("languages.missing", { fields: missing.map((field) => translate(`fields.${field}`)).join(", ") })}
            </Text>}
          </Stack>;
        })}
      </Stack>
    </Section>

    <Section title={translate("classification.title")}>
      <Stack gap="sm">
        <Select label={translate("classification.category")} placeholder={translate("classification.noCategory")} clearable disabled={!editable}
          data={categories.filter((category) => category.active || category.id === state.categoryId).map((category) => ({ value: category.id, label: resolveI18nString(category.name, locale) }))}
          value={state.categoryId} onChange={(value) => onChange({ categoryId: value })} />
        <TagPicker value={state.tagIds} initial={tags} onChange={onTags} canCreate={can.createTags} disabled={!editable} />
        <Select label={translate("classification.author")} description={can.editAll ? undefined : translate("classification.authorLocked")} clearable={can.editAll}
          disabled={!editable || !can.editAll} searchable data={authors.map((author) => ({ value: author.id, label: author.name }))}
          value={state.authorId} onChange={(value) => onChange({ authorId: value })} />
      </Stack>
    </Section>

    <Section title={translate("cover.title")} description={translate("cover.description")}>
      <Stack gap="sm">
        {cover ? <AspectRatio ratio={16 / 9} className={styles.cover} style={{ backgroundColor: cover.color }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- same-origin immutable rendition */}
          <img src={`/media/${cover.id}/md`} alt={resolveI18nString(cover.alt, locale)} />
        </AspectRatio> : <Text size="sm" c="dimmed">{translate("cover.none")}</Text>}
        {editable && <Group gap="xs">
          <Button size="xs" variant="light" leftSection={<ImagePlus size={14} aria-hidden="true" />} onClick={onPickCover}>{translate(cover ? "cover.change" : "cover.choose")}</Button>
          {cover && <Button size="xs" variant="subtle" color="red" leftSection={<X size={14} aria-hidden="true" />} onClick={() => onChange({ coverMediaId: null })}>{translate("cover.remove")}</Button>}
        </Group>}
      </Stack>
    </Section>

    <Section title={translate("highlight.title")}>
      <Stack gap="sm">
        <Switch label={translate("highlight.featured")} description={translate("highlight.featuredHelp")} checked={state.featured} disabled={!editable}
          onChange={(event) => onChange({ featured: event.currentTarget.checked })} />
        <Switch label={translate("highlight.breaking")} description={translate("highlight.breakingHelp")} checked={state.breaking} disabled={!editable} color="red"
          onChange={(event) => onChange({ breaking: event.currentTarget.checked })} />
      </Stack>
    </Section>

    {can.ai && <Section title={translate("ai.title")} description={translate("ai.description")}>
      <Link href={{ pathname: "/panel/ai-writer", query: { news: view.id } }}>
        <Button component="span" variant="light" color="grape" fullWidth leftSection={<Sparkles size={16} aria-hidden="true" />}>{translate("ai.open")}</Button>
      </Link>
    </Section>}

    <ScheduleModal initial={scheduling} onClose={() => setScheduling(null)} onConfirm={(at) => { setScheduling(null); onAction("schedule", at); }} />
  </>;
}

/** A local date and time for `datetime-local`, from an ISO instant (an hour from `now` when there is none). */
function localValue(iso: string | null, now: number): string {
  const date = iso ? new Date(iso) : new Date(now + 60 * 60 * 1000);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** Asks when to publish; mounted fresh each time it opens, from the value the button computed. */
function ScheduleModal({ initial, onClose, onConfirm }: { initial: string | null; onClose: () => void; onConfirm: (iso: string) => void }) {
  const translate = useTranslations("Builder.schedule");
  return <Modal opened={initial !== null} onClose={onClose} title={translate("title")} centered radius="lg">
    {initial !== null && <ScheduleForm initial={initial} onClose={onClose} onConfirm={onConfirm} />}
  </Modal>;
}

function ScheduleForm({ initial, onClose, onConfirm }: { initial: string; onClose: () => void; onConfirm: (iso: string) => void }) {
  const translate = useTranslations("Builder.schedule");
  const [value, setValue] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const confirm = () => {
    const when = value ? new Date(value) : null;
    if (!when || Number.isNaN(when.getTime()) || when.getTime() <= Date.now() + 60_000) return setInvalid(true);
    onConfirm(when.toISOString());
  };
  return <Stack gap="md">
    <Text size="sm" c="dimmed">{translate("description")}</Text>
    <TextInput type="datetime-local" label={translate("when")} value={value} onChange={(event) => { setValue(event.currentTarget.value); setInvalid(false); }}
      error={invalid ? translate("future") : undefined} />
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose}>{translate("cancel")}</Button>
      <Button disabled={!value} leftSection={<CalendarClock size={16} aria-hidden="true" />} onClick={confirm}>{translate("confirm")}</Button>
    </Group>
  </Stack>;
}
