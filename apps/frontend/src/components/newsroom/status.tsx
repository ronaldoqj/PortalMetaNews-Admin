"use client";

import { Badge, Group, Tooltip } from "@mantine/core";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { CONTENT_LOCALES, type ContentLocale } from "../../i18n/locales";
import { StatusBadge, type Tone } from "../ui";
import type { NewsStatus } from "./contracts";

/** What each status means at a glance: drafts neutral, review waiting, scheduled informative, published done. */
export const STATUS_TONES: Record<NewsStatus, Tone> = { draft: "neutral", review: "warning", scheduled: "info", published: "success", archived: "neutral" };

export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  const translate = useTranslations("News.status");
  return <StatusBadge tone={STATUS_TONES[status]}>{translate(status)}</StatusBadge>;
}

/** The languages an item is published in: filled for each one chosen, dimmed for the other. */
export function LocaleBadges({ locales }: { locales: readonly ContentLocale[] }) {
  const translate = useTranslations("News");
  return <Group gap={4} wrap="nowrap">
    {CONTENT_LOCALES.map((locale) => <Tooltip key={locale} label={translate(locales.includes(locale) ? "localeOn" : "localeOff", { locale: locale.toUpperCase() })}>
      <Badge size="xs" radius="sm" variant={locales.includes(locale) ? "light" : "outline"} color={locales.includes(locale) ? "brand" : "gray"}>{locale.toUpperCase()}</Badge>
    </Tooltip>)}
  </Group>;
}

export function AiBadge() {
  const translate = useTranslations("News");
  return <Tooltip label={translate("aiAssistedHint")}>
    <Badge size="xs" radius="sm" variant="light" color="grape" leftSection={<Sparkles size={10} aria-hidden="true" />}>{translate("aiAssisted")}</Badge>
  </Tooltip>;
}
