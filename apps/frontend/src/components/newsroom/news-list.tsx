"use client";

import { Anchor, AspectRatio, ColorSwatch, Group, Stack, Tabs, Text } from "@mantine/core";
import { Archive, Eye, ImageOff, Newspaper, Pencil, RotateCcw, Trash2, Undo2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { resolveI18nString } from "../../i18n/i18n-string";
import { Link, useRouter } from "../../i18n/navigation";
import { useApiAction } from "../shared/use-api-action";
import { DataView, EmptyState, FilterBar, FilterSelect, Pager, SearchField, Section, Switch, useConfirmation, useFormat, useListingView, useUrlState, type Column } from "../ui";
import { changeNewsStatus, deleteNews } from "./actions";
import { NEWS_STATUSES, type Category, type NewsAction, type NewsList, type NewsSummary } from "./contracts";
import { AiBadge, LocaleBadges, NewsStatusBadge } from "./status";

/**
 * The newsroom's list: a tab per status with its count, search, section, "mine" and order in the address, and each
 * row's actions offered by what the API says the account may do with that item.
 */
export function NewsListView({ data, categories }: { data: NewsList; categories: readonly Category[] }) {
  const translate = useTranslations("News");
  const locale = useLocale();
  const format = useFormat();
  const url = useUrlState();
  const router = useRouter();
  const confirmation = useConfirmation();
  const status = useApiAction(changeNewsStatus);
  const listView = useListingView("news");
  const total = NEWS_STATUSES.reduce((sum, item) => sum + data.counts[item], 0);
  const title = (item: NewsSummary) => resolveI18nString(item.title, locale) || translate("untitled");
  const move = (item: NewsSummary, action: NewsAction) => {
    const run = async () => { const result = await status.run(item.id, { action }); if (result.ok) router.refresh(); return result; };
    if (action === "unpublish" || action === "archive") {
      confirmation.ask({ title: translate(`confirm.${action}.title`), description: translate(`confirm.${action}.description`, { title: title(item) }), tone: "warning",
        confirmLabel: translate(`actions.${action}`), run, success: translate(`done.${action}`) });
    } else void run();
  };
  const columns: Column<NewsSummary>[] = [
    { key: "cover", header: translate("columns.cover"), card: "cover", width: 96, visibleFrom: "sm", render: (item) =>
      <AspectRatio ratio={16 / 9} data-cover="" style={{ backgroundColor: item.coverColor ?? "var(--app-highlight)" }}>
        {item.coverMediaId
          // eslint-disable-next-line @next/next/no-img-element -- same-origin immutable rendition
          ? <img src={`/media/${item.coverMediaId}/sm`} alt="" loading="lazy" decoding="async" />
          : <Group justify="center" c="dimmed"><ImageOff size={20} aria-hidden="true" /></Group>}
      </AspectRatio> },
    { key: "title", header: translate("columns.title"), card: "title", render: (item) => <Stack gap={4} miw={0}>
      <Anchor component={Link} href={{ pathname: "/panel/news/[id]", params: { id: item.id } }} fw={600} c="inherit" lineClamp={2}>{title(item)}</Anchor>
      <Group gap={6}>
        <LocaleBadges locales={item.locales} />
        {item.breaking && <Text size="xs" fw={700} c="red">{translate("breaking")}</Text>}
        {item.featured && <Text size="xs" fw={600} c="dimmed">{translate("featured")}</Text>}
        {item.aiAssisted && <AiBadge />}
      </Group>
    </Stack> },
    { key: "status", header: translate("columns.status"), card: "aside", render: (item) => <NewsStatusBadge status={item.status} />, width: 120 },
    { key: "category", header: translate("columns.category"), visibleFrom: "md", render: (item) => item.category
      ? <Group gap={6} wrap="nowrap"><ColorSwatch size={10} color={`var(--mantine-color-${item.category.color}-6)`} withShadow={false} />
        <Text size="sm">{resolveI18nString(item.category.name, locale)}</Text></Group> : <Text size="sm" c="dimmed">—</Text> },
    { key: "author", header: translate("columns.author"), visibleFrom: "lg", render: (item) => <Text size="sm">{item.author?.name ?? "—"}</Text> },
    { key: "date", header: translate("columns.date"), visibleFrom: "sm", render: (item) => <Stack gap={0}>
      <Text size="sm">{format.dateTime(item.publishedAt ?? item.scheduledAt ?? item.updatedAt)}</Text>
      <Text size="xs" c="dimmed">{translate(item.publishedAt ? "dates.published" : item.scheduledAt ? "dates.scheduled" : "dates.updated")}</Text>
    </Stack> },
    { key: "views", header: translate("columns.views"), align: "right", visibleFrom: "md", render: (item) => <Text size="sm">{format.number(item.views)}</Text>, width: 90 },
  ];
  const current = url.get("status");
  return <Stack gap="md">
    <Tabs value={current || "all"} onChange={(value) => url.set({ status: value === "all" ? null : value })}>
      <Tabs.List>
        <Tabs.Tab value="all">{translate("tabs.all", { count: total })}</Tabs.Tab>
        {NEWS_STATUSES.map((item) => <Tabs.Tab key={item} value={item}>{translate(`tabs.${item}`, { count: data.counts[item] })}</Tabs.Tab>)}
      </Tabs.List>
    </Tabs>
    <FilterBar end={<>
      <Switch label={translate("filters.mine")} checked={url.get("mine") === "true"} onChange={(event) => url.set({ mine: event.currentTarget.checked ? "true" : null })} />
      {data.items.length > 0 && listView.toggle}
    </>}>
      <SearchField label={translate("filters.search")} />
      <FilterSelect param="category" label={translate("filters.category")} data={categories.map((category) => ({ value: category.id, label: resolveI18nString(category.name, locale) }))} />
      <FilterSelect param="sort" label={translate("filters.sort")} width={170}
        data={(["updated", "published", "views"] as const).map((value) => ({ value, label: translate(`sort.${value}`) }))} />
    </FilterBar>
    <Section flush>
      <DataView rows={data.items} columns={columns} rowKey={(item) => item.id} minWidth={720} view={listView.view}
        onOpen={(item) => router.push({ pathname: "/panel/news/[id]", params: { id: item.id } })}
        empty={<EmptyState icon={Newspaper} title={translate(url.get("q") || current ? "emptyFiltered" : "empty")} description={translate("emptyHint")} plain />}
        actions={(item) => [
          { label: translate(item.permissions.edit ? "actions.edit" : "actions.open"), icon: item.permissions.edit ? Pencil : Eye, href: { pathname: "/panel/news/[id]", params: { id: item.id } } },
          item.permissions.publish && ["draft", "review", "scheduled", "archived"].includes(item.status) && { label: translate("actions.publish"), icon: Upload, onClick: () => move(item, "publish") },
          item.permissions.publish && ["published", "scheduled"].includes(item.status) && { label: translate("actions.unpublish"), icon: Undo2, onClick: () => move(item, "unpublish") },
          item.permissions.publish && item.status === "published" && { label: translate("actions.archive"), icon: Archive, onClick: () => move(item, "archive") },
          item.permissions.publish && item.status === "archived" && { label: translate("actions.restore"), icon: RotateCcw, onClick: () => move(item, "restore") },
          item.permissions.delete && { label: translate("actions.delete"), icon: Trash2, tone: "danger" as const, onClick: () => confirmation.ask({
            title: translate("confirm.delete.title"), description: translate("confirm.delete.description", { title: title(item) }), confirmLabel: translate("actions.delete"),
            run: () => deleteNews(item.id), success: translate("done.delete"), done: () => router.refresh(),
          }) },
        ]} />
    </Section>
    <Pager total={data.total} pageSize={data.pageSize} label={translate("count", { count: data.total })} />
    {confirmation.dialog}
  </Stack>;
}
