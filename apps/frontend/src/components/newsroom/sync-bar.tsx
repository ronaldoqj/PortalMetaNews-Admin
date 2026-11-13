"use client";

import { Group, Stack, Text } from "@mantine/core";
import { ArrowRightLeft, Languages, PauseCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import type { ContentLocale } from "../../i18n/locales";
import { useApiErrorMessage } from "../shared/use-api-action";
import { Button, Notice, Switch } from "../ui";
import type { ApiFailure } from "../admin/api-result";
import type { AiStatus, TranslationState } from "./contracts";
import { otherLocale } from "./translation-sync";

/**
 * What the language sync is doing, above the builder's fields: running from one language into the other (with a
 * switch to stop it), paused because someone wrote in the other language (with both ways to resume), or unavailable
 * because the AI does not answer. A local provider's translation is labelled as simulated.
 */
export function SyncBar({ sync, ai, canUseAi, editable, simulated, failure, resuming, onToggle, onResume }: {
  sync: TranslationState; ai: AiStatus | null; canUseAi: boolean; editable: boolean; simulated: boolean; failure: ApiFailure | null; resuming: boolean;
  onToggle: (enabled: boolean) => void; onResume: (source: ContentLocale) => void;
}) {
  const translate = useTranslations("Builder.sync");
  const message = useApiErrorMessage();
  const from = sync.source.toUpperCase();
  const to = otherLocale(sync.source).toUpperCase();
  if (!editable) return null;
  if (!canUseAi) return <Notice tone="neutral" icon={Languages}>{translate("noPermission")}</Notice>;
  if (!ai?.available) {
    return <Notice tone="warning" icon={Languages} title={translate("unavailableTitle")}>
      <Stack gap={4}><Text size="sm">{translate("unavailable")}</Text>
        <Link href="/panel/settings/ai">{translate("configure")}</Link></Stack>
    </Notice>;
  }
  return <Stack gap="xs">
    {sync.enabled
      ? <Notice tone="info" icon={ArrowRightLeft}>
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Text size="sm">{translate("running", { from, to })}</Text>
          <Switch size="sm" checked onChange={() => onToggle(false)} label={translate("toggle")} />
        </Group>
      </Notice>
      : <Notice tone="warning" icon={PauseCircle} title={translate("pausedTitle")}>
        <Stack gap="xs">
          <Text size="sm">{translate("paused", { from, to })}</Text>
          <Group gap="xs">
            <Button size="xs" loading={resuming} onClick={() => onResume(sync.source)} leftSection={<ArrowRightLeft size={14} aria-hidden="true" />}>
              {translate("resume", { from, to })}
            </Button>
            <Button size="xs" variant="default" loading={resuming} onClick={() => onResume(otherLocale(sync.source))}>{translate("resume", { from: to, to: from })}</Button>
          </Group>
        </Stack>
      </Notice>}
    {(simulated || !ai.generative) && <Text size="xs" c="dimmed">{translate("simulated")}</Text>}
    {failure && <Notice tone="danger">{message(failure, { ai_unconfigured: translate("unavailable"), ai_disabled: translate("unavailable") })}</Notice>}
  </Stack>;
}
