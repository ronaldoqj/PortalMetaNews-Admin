"use client";

import { Alert, Badge, Group, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ApiFailure } from "../admin/api-result";
import { PageHeader } from "../shared/page-header";
import { Card } from "./card";
import { Title } from "./title";

/** A page of the panel, the console or the portal: its heading and, below, its content. */
export function Page({ title, description, actions, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return <Stack gap="lg"><PageHeader title={title} description={description} actions={actions} />{children}</Stack>;
}

/** A titled card: the one frame for every block of a page (a list, a form, a chart, a panel of details). */
export function Section({ title, description, actions, icon: Icon, children, flush = false }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: LucideIcon; children?: ReactNode;
  /** The content touches the card's edges (a table); only the heading keeps its padding. */
  flush?: boolean;
}) {
  const heading = (title || actions) && <Group data-section-heading="" justify="space-between" align="flex-start" gap="md" wrap="nowrap" p={flush ? "lg" : 0} pb={flush ? "sm" : 0} mb={flush || !children ? 0 : "md"}>
    <Group gap="sm" wrap="nowrap" align="flex-start" miw={0}>
      {Icon && <ThemeIcon variant="light" size={36} radius="md" aria-hidden="true"><Icon size={18} /></ThemeIcon>}
      <Stack gap={2} miw={0}>
        {title && <Title order={3} size="h4">{title}</Title>}
        {description && <Text size="sm" c="dimmed" component={typeof description === "string" ? "p" : "div"}>{description}</Text>}
      </Stack>
    </Group>
    {actions && <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>{actions}</Group>}
  </Group>;
  // `data-section` lets a list drawn as cards drop the frame (`data-view.module.css`): the cards are frames of their own.
  return <Card withBorder radius="lg" p={flush ? 0 : "lg"} style={{ overflow: "hidden" }} data-section="">{heading}{children}</Card>;
}

/** One figure with its label: the cell of every summary row. */
export function Stat({ label, value, hint, icon: Icon, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: Tone }) {
  return <Card withBorder radius="lg" p="md">
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={2} miw={0}>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: "0.04em" }}>{label}</Text>
        <Text fz={26} fw={700} lh={1.2}>{value}</Text>
        {hint && <Text size="xs" c="dimmed">{hint}</Text>}
      </Stack>
      {Icon && <ThemeIcon variant="light" color={tone ? TONES[tone] : undefined} size={38} radius="md" aria-hidden="true"><Icon size={20} /></ThemeIcon>}
    </Group>
  </Card>;
}

/** A row of {@link Stat}s that wraps by itself. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">{children}</SimpleGrid>;
}

/** What a state means, never a colour by itself: `brand` is the identity's primary colour. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";
const TONES: Record<Tone, string | undefined> = { neutral: "gray", info: "blue", success: "teal", warning: "orange", danger: "red", brand: undefined };

/** A state as a small label; `color` takes one of the workspace's own label colours instead of a tone. */
export function StatusBadge({ tone = "neutral", color, children }: { tone?: Tone; color?: string; children: ReactNode }) {
  return <Badge variant="light" color={color ?? TONES[tone]} radius="sm" tt="none" fw={600}>{children}</Badge>;
}

/** A message inside the page: why something is unavailable, what a setting changes, what to do next. */
export function Notice({ tone = "info", title, icon: Icon, children }: { tone?: Tone; title?: ReactNode; icon?: LucideIcon; children?: ReactNode }) {
  return <Alert color={TONES[tone]} variant="light" radius="md" title={title} role={tone === "danger" ? "alert" : "status"}
    icon={Icon ? <Icon size={18} aria-hidden="true" /> : undefined}>{children}</Alert>;
}

/** What a page shows in place of content the API refused, worded by `Common.errors` (or the caller's own text per kind). */
export function ApiFailureNotice({ failure, messages }: { failure: ApiFailure; messages?: Partial<Record<string, string>> }) {
  const translate = useTranslations("Common.errors");
  const text = (failure.code && messages?.[failure.code]) || messages?.[failure.error] || translate(failure.error);
  return <Notice tone={failure.error === "conflict" ? "warning" : "danger"}>{text}</Notice>;
}

/** Labelled values, side by side where there is room: the details of one record. */
export function DetailList({ items, columns = 2 }: { items: ReadonlyArray<{ label: ReactNode; value: ReactNode } | false | null | undefined>; columns?: 1 | 2 | 3 }) {
  return <SimpleGrid cols={{ base: 1, sm: columns }} spacing="md" verticalSpacing="sm">
    {items.filter((item) => !!item).map((item, index) => <Stack key={index} gap={2} miw={0}>
      <Text size="xs" c="dimmed" fw={600}>{item.label}</Text>
      <Text component="div" size="sm" style={{ overflowWrap: "anywhere" }}>{item.value ?? "—"}</Text>
    </Stack>)}
  </SimpleGrid>;
}
