"use client";

import { Anchor, Badge, Group, Stack, Text } from "@mantine/core";
import { Inbox, Mail } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { CONTACT_STATUSES, CONTACT_TOPICS, type ContactMessage, type ContactPage, type ContactStatus } from "@/components/admin/contacts-contracts";
import { richTextReadable } from "@/components/forms/rich-text";
import { DataView, EmptyState, FilterBar, FilterSelect, Pager, SearchField, Section, useListingView, type Column } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";

const STATUS_COLORS: Record<ContactStatus, string> = { new: "red", read: "teal", archived: "gray" };

/**
 * The readers' messages sent through the site's contact form, as cards or rows. Search, filters and page live in the
 * address, so a view can be shared and reloaded; each message opens on its own page.
 */
export function ContactInbox({ data }: { data: ContactPage }) {
  const t = useTranslations("Contacts");
  const format = useFormatter();
  const router = useRouter();
  const listView = useListingView("contacts");
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "short", timeStyle: "short" });
  const columns: Column<ContactMessage>[] = [
    { key: "from", header: t("columns.from"), card: "title", render: (message) => <Stack gap={2} miw={0}>
      <Anchor component={Link} href={{ pathname: "/panel/contacts/[id]", params: { id: message.id } }} c="inherit" fw={message.status === "new" ? 800 : 600}
        onClick={(event) => event.stopPropagation()}>{message.name}</Anchor>
      <Text size="sm" c="dimmed" style={{ overflowWrap: "anywhere" }}>{message.email}</Text>
    </Stack> },
    { key: "status", header: t("columns.status"), card: "aside", render: (message) => <Group gap={6} wrap="nowrap">
      <Badge variant="light" color={STATUS_COLORS[message.status]} tt="none">{t(`statuses.${message.status}`)}</Badge>
      <Badge variant="outline" tt="none">{t(`topics.${message.topic}`)}</Badge>
    </Group> },
    { key: "message", header: t("columns.message"), visibleFrom: "md", render: (message) => <Text size="sm" lineClamp={2}>{richTextReadable(message.message) ?? message.message}</Text> },
    { key: "date", header: t("columns.date"), render: (message) => <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{date(message.createdAt)}</Text> },
  ];
  return <Stack gap="lg">
    <FilterBar end={data.unread > 0 && <Badge color="red" variant="light" size="lg" tt="none">{t("unread", { count: data.unread })}</Badge>}>
      <SearchField param="search" label={t("filters.search")} placeholder={t("filters.searchPlaceholder")} />
      <FilterSelect param="status" label={t("filters.status")} data={CONTACT_STATUSES.map((value) => ({ value, label: t(`statuses.${value}`) }))} />
      <FilterSelect param="topic" label={t("filters.topic")} data={CONTACT_TOPICS.map((value) => ({ value, label: t(`topics.${value}`) }))} />
    </FilterBar>
    <Section title={t("listTitle")} icon={Mail} flush actions={data.items.length > 0 && listView.toggle}>
      <DataView rows={data.items} columns={columns} rowKey={(message) => message.id} view={listView.view} minWidth={720}
        onOpen={(message) => router.push({ pathname: "/panel/contacts/[id]", params: { id: message.id } })}
        empty={<EmptyState plain icon={Inbox} title={t("empty")} description={t("emptyHint")} />} />
    </Section>
    <Pager total={data.total} pageSize={data.pageSize} label={t("total", { count: data.total })} />
  </Stack>;
}
