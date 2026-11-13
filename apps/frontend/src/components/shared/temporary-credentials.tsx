"use client";

import { Alert, Code, Group, Stack, Text } from "@mantine/core";
import { Check, Copy, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TemporaryCredentials } from "../admin/contracts";
import { Button, CopyButton } from "../ui/button";
import { Modal } from "./dialog";

/** The one-time password with a copy button, the once-only warning and what happened to the e-mail. */
export function TemporaryCredentialsPanel({ credentials }: { credentials: TemporaryCredentials }) {
  const t = useTranslations("Credentials");
  return <Stack gap="md">
    <Alert color="orange" icon={<KeyRound size={18} aria-hidden="true" />}><Text size="sm" fw={600}>{t("onceWarning")}</Text></Alert>
    <Stack gap={4}>
      <Text size="sm" c="dimmed">{t("email")}</Text>
      <Text fw={600} style={{ overflowWrap: "anywhere" }}>{credentials.email}</Text>
    </Stack>
    <Stack gap={4}>
      <Text size="sm" c="dimmed">{t("password")}</Text>
      <Group gap="sm" wrap="nowrap" align="center">
        <Code fz="lg" fw={700} px="sm" py={6} style={{ letterSpacing: "0.08em", userSelect: "all" }} data-temporary-password>
          {credentials.temporaryPassword}
        </Code>
        <CopyButton value={credentials.temporaryPassword} timeout={2500}>
          {({ copied, copy }) => <Button size="xs" variant={copied ? "filled" : "light"} color={copied ? "teal" : undefined}
            leftSection={copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} onClick={copy}>
            {t(copied ? "copied" : "copy")}
          </Button>}
        </CopyButton>
      </Group>
    </Stack>
    <Text size="sm" role="status">{t(`delivery.${credentials.delivery}`, { email: credentials.email })}</Text>
  </Stack>;
}

/** Shown right after a password is generated; closing it discards the only copy kept by the interface. */
export function TemporaryCredentialsDialog({ credentials, onClose }: { credentials?: TemporaryCredentials; onClose: () => void }) {
  const t = useTranslations("Credentials");
  return <Modal opened={!!credentials} onClose={onClose} title={t("title")} centered
    footer={<Button onClick={onClose}>{t("done")}</Button>}>
    {credentials && <TemporaryCredentialsPanel credentials={credentials} />}
  </Modal>;
}
