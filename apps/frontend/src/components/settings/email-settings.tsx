"use client";

import { Stack } from "@mantine/core";
import { Mail, Send, Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AutoForm, Button, DetailList, Notice, Section, StatusBadge, useApiAction, type FormField } from "../ui";
import { saveEmailSettings, testEmail } from "./actions";
import type { EmailSettings, EmailTest } from "./contracts";

type Values = {
  enabled: boolean; host: string; port: number | null; secure: boolean; user: string; password: string; removePassword: boolean; fromEmail: string; fromName: string;
};

/**
 * The portal's outgoing e-mail (the notice of a reader's message to the contact address, the test): off until turned
 * on, through the relay saved here (password encrypted, write-only) or, without one, the server's own (`SMTP_*`).
 */
export function EmailSettingsPanel({ settings }: { settings: EmailSettings }) {
  const t = useTranslations("EmailSettings");
  const [test, setTest] = useState<EmailTest>();
  const runTest = useApiAction(testEmail, { quiet: true });
  const fields: FormField<Values>[] = [
    { name: "enabled", type: "switch", label: t("enabled"), description: t("enabledHelp") },
    { name: "host", type: "text", label: t("host"), placeholder: "smtp.example.com", maxLength: 253 },
    { name: "port", type: "number", label: t("port"), min: 1, max: 65535, description: t("portHelp") },
    { name: "secure", type: "switch", label: t("secure"), description: t("secureHelp") },
    { name: "user", type: "text", label: t("user"), maxLength: 254 },
    { name: "password", type: "password", label: t("password"), description: settings.passwordSet ? t("passwordKept") : t("passwordHelp"), maxLength: 512 },
    { name: "removePassword", type: "switch", label: t("removePassword"), when: () => settings.passwordSet },
    { name: "fromEmail", type: "email", label: t("fromEmail"), maxLength: 254 },
    { name: "fromName", type: "text", label: t("fromName"), maxLength: 100 },
  ];
  const effective = !settings.enabled ? "off" : settings.effective ?? "missing";
  return <Stack gap="lg">
    <Section title={t("current")} icon={Mail} actions={<Button size="xs" variant="light" leftSection={<Send size={14} aria-hidden="true" />} loading={runTest.pending}
      disabled={!settings.effective && !settings.host && !settings.environmentRelay}
      onClick={async () => { const result = await runTest.run(); setTest(result.ok ? result.data : { ok: false, code: "smtp_unreachable" }); }}>{t("test.run")}</Button>}>
      <Stack gap="md">
        <DetailList columns={3} items={[
          { label: t("status"), value: <StatusBadge tone={effective === "panel" || effective === "environment" ? "success" : effective === "off" ? "neutral" : "warning"}>{t(`effective.${effective}`)}</StatusBadge> },
          { label: t("environmentRelay"), value: t(settings.environmentRelay ? "environmentYes" : "environmentNo") },
          { label: t("panelRelay"), value: settings.host ? `${settings.host}:${settings.port ?? "—"}` : t("panelRelayNone") },
        ]} />
        {effective === "missing" && <Notice tone="warning">{t("missingNotice")}</Notice>}
        {test && <Notice tone={test.ok ? "success" : "danger"}>{test.ok ? t("test.ok") : t("test.failed", { reason: test.code && t.has(`codes.${test.code}`) ? t(`codes.${test.code}`) : test.code ?? "—" })}</Notice>}
      </Stack>
    </Section>
    <AutoForm<Values> layout="page" fields={fields} success={t("saved")}
      sections={[
        { title: t("sendingSection"), description: t("sendingSectionHelp"), icon: Mail, fields: ["enabled"] },
        { title: t("serverSection"), description: t("serverSectionHelp"), icon: Server, fields: ["host", "port", "secure", "user", "password", "removePassword", "fromEmail", "fromName"] },
      ]}
      initial={{
        enabled: settings.enabled, host: settings.host ?? "", port: settings.port, secure: settings.secure, user: settings.user ?? "", password: "", removePassword: false,
        fromEmail: settings.fromEmail ?? "", fromName: settings.fromName ?? "",
      }}
      errors={{ smtp_invalid: t("errors.invalid"), invalidInput: t("errors.invalid") }}
      onSubmit={(values) => saveEmailSettings({
        enabled: values.enabled, host: values.host.trim() || null, port: values.port, secure: values.secure, user: values.user.trim() || null,
        password: values.removePassword ? "" : values.password || undefined, fromEmail: values.fromEmail.trim() || null, fromName: values.fromName.trim() || null,
      })} />
  </Stack>;
}
