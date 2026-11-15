"use client";

import { Group, Stack, Text } from "@mantine/core";
import { Bot, KeyRound, PlugZap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AutoForm, Button, DetailList, Notice, Section, StatusBadge, useApiAction, type FormField } from "../ui";
import { saveAiSettings, testAi } from "./actions";
import { AiStylesManager } from "./ai-styles";
import type { AiSettings, AiStyle, AiTest } from "./contracts";

type Values = { provider: string; apiKey: string; removeKey: boolean; textModel: string; imageModel: string; images: boolean };

/**
 * The model provider of the portal: Gemini with a key (stored encrypted, write-only), the local provider (offline
 * simulation, development only) or off, and the newsroom's editorial styles, which go into the prompts.
 */
export function AiSettingsPanel({ settings, styles }: { settings: AiSettings; styles: readonly AiStyle[] }) {
  const t = useTranslations("AiSettings");
  const [test, setTest] = useState<AiTest>();
  const runTest = useApiAction(testAi, { quiet: true });
  const effective = settings.effective;
  const fields: FormField<Values>[] = [
    { name: "provider", type: "select", label: t("provider"), description: t("providerHelp"), required: true,
      options: ["auto", "gemini", "local", "disabled"].map((value) => ({ value, label: t(`providers.${value}`) })) },
    { name: "apiKey", type: "password", label: t("apiKey"), maxLength: 256, wide: true,
      description: [settings.apiKeySet ? t("apiKeyKept") : t("apiKeyHelp"), settings.environmentKeySet ? t("apiKeyEnvironment") : ""].filter(Boolean).join(" "),
      when: (values) => values.provider === "auto" || values.provider === "gemini" },
    { name: "removeKey", type: "switch", label: t("removeKey"), when: (values) => settings.apiKeySet && (values.provider === "auto" || values.provider === "gemini") },
    { name: "textModel", type: "text", label: t("textModel"), placeholder: settings.defaults.textModel, description: t("modelHelp"), maxLength: 100,
      when: (values) => values.provider === "auto" || values.provider === "gemini" },
    { name: "imageModel", type: "text", label: t("imageModel"), placeholder: settings.defaults.imageModel, description: t("imageModelHelp"), maxLength: 100,
      when: (values) => values.provider === "auto" || values.provider === "gemini" },
    { name: "images", type: "switch", label: t("images"), description: t("imagesHelp") },
  ];
  return <Stack gap="lg">
    <Section title={t("current")} icon={Bot} actions={<Button size="xs" variant="light" leftSection={<PlugZap size={14} aria-hidden="true" />} loading={runTest.pending}
      onClick={async () => { const result = await runTest.run(); setTest(result.ok ? result.data : { ok: false, provider: null, code: "ai_provider_failed" }); }}>{t("test.run")}</Button>}>
      <Stack gap="md">
        <DetailList columns={3} items={[
          { label: t("status"), value: <StatusBadge tone={effective.available ? "success" : "danger"}>{t(effective.available ? "available" : "unavailable")}</StatusBadge> },
          { label: t("effectiveProvider"), value: effective.provider ? t(`providers.${effective.provider}`) : "—" },
          { label: t("key"), value: settings.apiKeySet ? t("keySet") : settings.environmentKeySet ? t("keyEnvironment") : t("keyMissing") },
          { label: t("textModel"), value: effective.textModel ?? "—" },
          { label: t("imageModel"), value: effective.imageModel ?? "—" },
          { label: t("images"), value: t(effective.images ? "imagesOn" : "imagesOff") },
        ]} />
        {effective.code && <Notice tone="warning">{t(`codes.${effective.code}`)}</Notice>}
        {effective.provider === "local" && <Notice tone="info">{t("localNotice")}</Notice>}
        {test && <Notice tone={test.ok ? "success" : "danger"}>{test.ok ? t("test.ok") : t("test.failed", { reason: test.code ? t(`codes.${test.code}`) : "—" })}</Notice>}
      </Stack>
    </Section>
    <AutoForm<Values> layout="page" fields={fields} success={t("saved")}
      sections={[
        { title: t("providerSection"), description: t("providerSectionHelp"), icon: KeyRound, fields: ["provider", "apiKey", "removeKey", "textModel", "imageModel", "images"] },
      ]}
      initial={{ provider: settings.provider, apiKey: "", removeKey: false, textModel: settings.textModel ?? "", imageModel: settings.imageModel ?? "", images: settings.images }}
      errors={{ ai_key_required: t("errors.keyRequired"), ai_key_invalid: t("errors.keyInvalid"), ai_model_invalid: t("errors.modelInvalid"), invalidInput: t("errors.invalidInput") }}
      onSubmit={(values) => saveAiSettings({
        provider: values.provider, apiKey: values.removeKey ? "" : values.apiKey.trim() || undefined,
        textModel: values.textModel.trim() || null, imageModel: values.imageModel.trim() || null, images: values.images,
      })}>
      <Group><Text size="xs" c="dimmed">{t("privacyNote")}</Text></Group>
    </AutoForm>
    <AiStylesManager styles={styles} />
  </Stack>;
}
