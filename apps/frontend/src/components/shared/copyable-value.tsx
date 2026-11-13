"use client";

import { Code, Group } from "@mantine/core";
import { Check, Copy } from "lucide-react";
import { ActionIcon, Button, CopyButton } from "../ui/button";
import { Tooltip } from "./dialog";

/**
 * A value shown in full with a button that copies it, so it never has to be selected by hand. The
 * clipboard is written locally by the browser; nothing about the copy is sent anywhere.
 */
export function CopyableValue({ value, labels }: {
  value: string;
  labels: { copy: string; copied: string; name: string };
}) {
  return <Group gap="sm" wrap="nowrap" align="stretch">
    <Code block flex={1} miw={0} style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap", userSelect: "all" }}>{value}</Code>
    <CopyButton value={value} timeout={2500}>
      {({ copied, copy }) => <Button variant={copied ? "filled" : "light"} color={copied ? "teal" : undefined} h="auto" style={{ flexShrink: 0 }}
        leftSection={copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} onClick={copy}
        aria-label={copied ? labels.copied : `${labels.copy}: ${labels.name}`}>
        <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
      </Button>}
    </CopyButton>
  </Group>;
}

/** A short value (a code) shown inline, with an icon that copies just that value. */
export function CopyableCode({ value, labels }: {
  value: string;
  labels: { copy: string; copied: string };
}) {
  return <Group gap={4} wrap="nowrap">
    <Code>{value}</Code>
    <CopyButton value={value} timeout={2000}>
      {({ copied, copy }) => <Tooltip label={copied ? labels.copied : labels.copy} withArrow>
        <ActionIcon variant="subtle" size="sm" color={copied ? "teal" : "gray"} onClick={copy} aria-label={`${labels.copy}: ${value}`}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </ActionIcon>
      </Tooltip>}
    </CopyButton>
  </Group>;
}
