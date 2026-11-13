"use client";

import { Alert, Anchor, Badge, Box, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { ArrowLeft, Archive, Eye, Reply, RotateCcw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { setContactStatus } from "@/components/admin/contacts-actions";
import type { ContactMessage, ContactStatus } from "@/components/admin/contacts-contracts";
import { RichTextContent } from "@/components/shared/rich-text-content";
import { useApiErrorMessage } from "@/components/shared/use-api-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Title } from "@/components/ui/title";
import { Link, useRouter } from "@/i18n/navigation";

const STATUS_COLORS: Record<ContactStatus, string> = { new: "red", read: "teal", archived: "gray" };

/** A reader's message with room to read it: who sent it, what about, and what to do next. Opening a new one reads it. */
export function ContactMessageView({ message }: { message: ContactMessage }) {
  const t = useTranslations("Contacts");
  const format = useFormatter();
  const router = useRouter();
  const refusal = useApiErrorMessage();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  const opened = useRef(false);

  function change(status: ContactStatus, back = false) {
    setError(undefined);
    startTransition(async () => {
      const result = await setContactStatus(message.id, status);
      if (!result.ok) { setError(refusal(result)); return; }
      if (back) router.push("/panel/contacts");
      router.refresh();
    });
  }

  useEffect(() => {
    if (opened.current || message.status !== "new") return;
    opened.current = true;
    void setContactStatus(message.id, "read").then((result) => { if (result.ok) router.refresh(); });
  }, [message.id, message.status, router]);

  const subject = encodeURIComponent(t("replySubject", { topic: t(`topics.${message.topic}`) }));
  return <Stack gap="lg">
    <Group justify="space-between" align="center">
      <Link href="/panel/contacts">
        <Button component="span" variant="default" leftSection={<ArrowLeft size={16} aria-hidden="true" />}>{t("back")}</Button>
      </Link>
      <Group gap="xs">
        {message.status !== "new" && <Button variant="default" leftSection={<Eye size={16} aria-hidden="true" />} disabled={pending}
          onClick={() => change("new", true)}>{t("markUnread")}</Button>}
        {message.status === "archived"
          ? <Button variant="default" leftSection={<RotateCcw size={16} aria-hidden="true" />} loading={pending} onClick={() => change("read")}>{t("restore")}</Button>
          : <Button variant="default" leftSection={<Archive size={16} aria-hidden="true" />} loading={pending} onClick={() => change("archived", true)}>{t("archive")}</Button>}
        <Button component="a" href={`mailto:${message.email}?subject=${subject}`} leftSection={<Reply size={16} aria-hidden="true" />}>{t("reply")}</Button>
      </Group>
    </Group>
    {error && <Alert color="red" role="alert">{error}</Alert>}
    <Card withBorder radius="md" p={{ base: "lg", md: "xl" }}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" gap="md">
          <Title order={2} size="h3">{message.name}</Title>
          <Group gap={6}>
            <Badge variant="outline" tt="none">{t(`topics.${message.topic}`)}</Badge>
            <Badge variant="light" color={STATUS_COLORS[message.status]} tt="none">{t(`statuses.${message.status}`)}</Badge>
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Field label={t("fields.email")}><Anchor href={`mailto:${message.email}`} size="sm">{message.email}</Anchor></Field>
          <Field label={t("fields.received")}>{date(message.createdAt)}</Field>
          <Field label={t("fields.language")}>{t(`languages.${message.locale === "en" ? "en" : "pt"}`)}</Field>
        </SimpleGrid>
        <Card withBorder radius="md" p="lg" bg="var(--app-highlight)">
          <Box style={{ overflowWrap: "anywhere" }}><RichTextContent value={message.message} /></Box>
        </Card>
        {message.readBy && message.readAt && <Text size="xs" c="dimmed">{t("readBy", { name: message.readBy, date: date(message.readAt) })}</Text>}
      </Stack>
    </Card>
  </Stack>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Stack gap={2} miw={0}>
    <Text size="xs" c="dimmed">{label}</Text>
    <Text size="sm" component="div" style={{ overflowWrap: "anywhere" }}>{children}</Text>
  </Stack>;
}
