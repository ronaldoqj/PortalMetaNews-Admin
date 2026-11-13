"use client";

import { Anchor, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { BookOpenCheck, CalendarClock, Eye, Inbox, Newspaper, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { resolveI18nString } from "../../i18n/i18n-string";
import { Link } from "../../i18n/navigation";
import type { Dashboard } from "../newsroom/contracts";
import { NewsStatusBadge } from "../newsroom/status";
import { EmptyState, useFormat } from "../ui";
import { BreakdownDonut } from "./breakdown-donut";
import { DashboardPanel } from "./dashboard-panel";
import { KpiCard } from "./kpi-card";
import { periodDelta } from "./period-delta";
import { DailyTrendChart } from "./trend-chart";

type Titled = { id: string; title: { pt?: string; en?: string } };

/**
 * The newsroom's overview: the week against the one before, the last 30 days of reads and publications, what is
 * read most, where the sections stand, and the work waiting for the account (its drafts, the review queue, the
 * schedule and readers' messages).
 */
export function NewsroomDashboard({ data, can }: { data: Dashboard; can: { review: boolean; messages: boolean } }) {
  const translate = useTranslations("Dashboard");
  const locale = useLocale();
  const format = useFormat();
  const titleOf = (item: Titled) => resolveI18nString(item.title, locale) || translate("untitled");
  const link = (item: Titled) => <Anchor component={Link} href={{ pathname: "/panel/news/[id]", params: { id: item.id } }} size="sm" fw={600} c="inherit" lineClamp={1}>{titleOf(item)}</Anchor>;
  return <Stack gap="lg">
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 5 }} spacing="md">
      <KpiCard label={translate("kpis.published")} value={data.week.published} icon={<Newspaper size={26} />} color="brand"
        delta={periodDelta(data.week.published, data.week.publishedPrevious)} comparison={translate("kpis.previousWeek")} caption={translate("kpis.week")} />
      <KpiCard label={translate("kpis.views")} value={data.week.views} icon={<Eye size={26} />} color="teal"
        delta={periodDelta(data.week.views, data.week.viewsPrevious)} comparison={translate("kpis.previousWeek")} caption={translate("kpis.week")} />
      <KpiCard label={translate("kpis.review")} value={data.statuses.review} icon={<BookOpenCheck size={26} />} color="orange" caption={translate("kpis.reviewCaption")} />
      <KpiCard label={translate("kpis.scheduled")} value={data.statuses.scheduled} icon={<CalendarClock size={26} />} color="blue" caption={translate("kpis.scheduledCaption")} />
      <KpiCard label={translate("kpis.ai")} value={data.aiAssisted} icon={<Sparkles size={26} />} color="grape" caption={translate("kpis.aiCaption")} />
    </SimpleGrid>

    <div className="dashboard-row dashboard-row-halves">
      <DashboardPanel title={translate("trend.title")} description={translate("trend.description")}>
        <Stack gap="md">
          <DailyTrendChart label={translate("trend.views")} points={data.trend.map((point) => ({ day: point.day, values: { views: point.views } }))}
            series={[{ key: "views", label: translate("trend.views"), color: "var(--dashboard-series-2)" }]} />
          <DailyTrendChart type="bar" height={140} label={translate("trend.published")} points={data.trend.map((point) => ({ day: point.day, values: { published: point.published } }))}
            series={[{ key: "published", label: translate("trend.published"), color: "var(--dashboard-series-1)" }]} />
        </Stack>
      </DashboardPanel>
      <DashboardPanel title={translate("sections.title")} description={translate("sections.description")} className="dashboard-breakdown-panel">
        {data.categories.some((category) => category.count > 0)
          ? <BreakdownDonut label={translate("sections.title")} centerLabel={translate("sections.center")}
            items={data.categories.filter((category) => category.count > 0).map((category) => ({
              key: category.id, label: resolveI18nString(category.name, locale), value: category.count, color: `var(--mantine-color-${category.color}-6)`,
            }))} />
          : <EmptyState icon={Newspaper} title={translate("sections.empty")} plain />}
      </DashboardPanel>
    </div>

    <div className="dashboard-row dashboard-row-halves dashboard-row-independent">
      <DashboardPanel title={translate("top.title")} description={translate("top.description")}>
        {data.top.length ? <Stack gap={0} component="ol" m={0} p={0} style={{ listStyle: "none" }}>
          {data.top.map((item, index) => <Group key={item.id} component="li" justify="space-between" wrap="nowrap" gap="sm" py={8}
            style={index ? { borderTop: "1px solid var(--app-border)" } : undefined}>
            <Group gap="sm" wrap="nowrap" miw={0}>
              <Text fw={800} c="dimmed" w={20}>{index + 1}</Text>
              <Stack gap={0} miw={0}>{link(item)}{item.category && <Text size="xs" c="dimmed">{resolveI18nString(item.category, locale)}</Text>}</Stack>
            </Group>
            <Text size="sm" fw={700} style={{ whiteSpace: "nowrap" }}>{translate("top.views", { count: item.views })}</Text>
          </Group>)}
        </Stack> : <EmptyState icon={Eye} title={translate("top.empty")} plain />}
      </DashboardPanel>
      <DashboardPanel title={translate("mine.title")} description={translate("mine.description")}>
        {data.mine.length ? <Stack gap="xs">{data.mine.map((item) => <Group key={item.id} justify="space-between" wrap="nowrap" gap="sm">
          <Stack gap={0} miw={0}>{link(item)}<Text size="xs" c="dimmed">{format.relative(item.updatedAt)}</Text></Stack>
          <NewsStatusBadge status={item.status} />
        </Group>)}</Stack> : <EmptyState icon={Newspaper} title={translate("mine.empty")} plain />}
      </DashboardPanel>
    </div>

    <div className="dashboard-row dashboard-row-halves dashboard-row-independent">
      {can.review && <DashboardPanel title={translate("review.title")} description={translate("review.description")}
        action={<Anchor component={Link} href={{ pathname: "/panel/news", query: { status: "review" } }} size="sm">{translate("seeAll")}</Anchor>}>
        {data.review.length ? <Stack gap="xs">{data.review.map((item) => <Stack key={item.id} gap={0}>
          {link(item)}<Text size="xs" c="dimmed">{[item.author, format.relative(item.updatedAt)].filter(Boolean).join(" · ")}</Text>
        </Stack>)}</Stack> : <EmptyState icon={BookOpenCheck} title={translate("review.empty")} plain />}
      </DashboardPanel>}
      <DashboardPanel title={translate("scheduled.title")} description={translate("scheduled.description")}>
        {data.scheduled.length ? <Stack gap="xs">{data.scheduled.map((item) => <Group key={item.id} justify="space-between" wrap="nowrap" gap="sm">
          {link(item)}<Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>{format.dateTime(item.scheduledAt)}</Text>
        </Group>)}</Stack> : <EmptyState icon={CalendarClock} title={translate("scheduled.empty")} plain />}
      </DashboardPanel>
      {can.messages && <DashboardPanel title={translate("messages.title")}>
        <Group justify="space-between">
          <Group gap="sm"><Inbox size={20} aria-hidden="true" /><Text>{translate("messages.unread", { count: data.unreadMessages })}</Text></Group>
          <Anchor component={Link} href="/panel/contacts" size="sm">{translate("messages.open")}</Anchor>
        </Group>
      </DashboardPanel>}
    </div>
  </Stack>;
}
