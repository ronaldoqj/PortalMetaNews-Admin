"use client";

import { Alert, Box, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Modal } from "./dialog";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/forms/input";

/** `danger` for what cannot be undone (red), `warning` for consequential changes (orange), `info` for the rest. */
export type ConfirmationTone = "danger" | "warning" | "info";
const TONES: Record<ConfirmationTone, { color: string; icon: typeof Info }> = {
  danger: { color: "red", icon: AlertTriangle },
  warning: { color: "orange", icon: AlertCircle },
  info: { color: "blue", icon: Info },
};

/**
 * Confirms an action before it runs: an icon in the tone's colour beside the title and what will happen,
 * then cancel and confirm. A typed confirmation (permanent deletion) keeps its warning in a red panel.
 */
export function ConfirmationDialog({ opened, title, description, onClose, onConfirm, pending = false, error, confirmation, value = "", onValueChange, tone = "danger", confirmLabel, children }: {
  opened: boolean; title: string; description: string; onClose: () => void; onConfirm: () => void;
  pending?: boolean; error?: string; confirmation?: string; value?: string; onValueChange?: (value: string) => void;
  tone?: ConfirmationTone; confirmLabel?: string;
  /** What the action also asks for, below its description. */
  children?: ReactNode;
}) {
  const translate = useTranslations("Confirmation");
  const { color, icon: Icon } = TONES[tone];
  // The icon and title form the dialog's own title, so assistive technology announces it by name.
  return <Modal opened={opened} onClose={() => !pending && onClose()} withCloseButton={false} centered radius="lg" size="md"
    title={<Group gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" color={color} size={34} radius="xl" style={{ flexShrink: 0 }}><Icon size={18} aria-hidden="true" /></ThemeIcon>
      <Text component="span" fw={700} size="lg">{title}</Text>
    </Group>}
    // The shared footer: divided from the content, with the actions side by side.
    footer={<>
      <Button variant="default" radius="md" onClick={onClose} disabled={pending}>{translate("cancel")}</Button>
      <Button color={color} radius="md" loading={pending} disabled={!!confirmation && value !== confirmation} onClick={onConfirm}>
        {confirmLabel ?? translate("confirm")}
      </Button>
    </>}>
    <Stack gap="md" py="xs">
      {confirmation
        ? <Box p="sm" bg={`var(--mantine-color-${color}-light)`} c={`var(--mantine-color-${color}-light-color)`} style={{ borderRadius: "var(--mantine-radius-md)" }}>
          <Text size="sm" fw={600}>{description}</Text>
        </Box>
        : <Text size="sm" c="dimmed" style={{ lineHeight: 1.55 }}>{description}</Text>}
      {children}
      {error && <Alert color="red" role="alert" variant="light" radius="md">{error}</Alert>}
      {confirmation && <TextInput label={translate("typeToConfirm", { value: confirmation })} value={value}
        onChange={(event) => onValueChange?.(event.currentTarget.value)} autoComplete="off" disabled={pending} />}
    </Stack>
  </Modal>;
}
