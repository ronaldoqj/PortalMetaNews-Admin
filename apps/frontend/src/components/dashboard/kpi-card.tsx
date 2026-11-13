"use client";

import { Group, Stack, Text, ThemeIcon, VisuallyHidden } from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import { useFormatter, useTranslations, type NumberFormatOptions } from "next-intl";
import type { ReactNode } from "react";
import { Card } from "../ui/card";

export interface KpiCardProps {
  label: string;
  /** `null` when there is nothing to measure yet; shown as a dash. */
  value: number | null;
  icon: ReactNode;
  /** Mantine colour or CSS colour of the icon tile; the value and label keep the text tokens. */
  color?: string;
  /** Relative change against the previous period, as a fraction (0.12 is 12%). */
  delta?: number;
  /** What the change is measured against, such as "vs. previous period". */
  comparison?: string;
  /** Number formatting of the value, for currencies or compact figures. */
  format?: NumberFormatOptions;
  /** A short line under the value, such as what it is made of, when no change is shown. */
  caption?: string;
}

export function KpiCard({ label, value, icon, color, delta, comparison, format, caption }: KpiCardProps) {
  const translate = useTranslations("Dashboard");
  const formatter = useFormatter();
  const rising = (delta ?? 0) >= 0;
  return <Card withBorder radius="md" p="lg" h="100%">
    <Group gap="md" wrap="nowrap" align="center">
      <ThemeIcon variant="light" color={color} size={56} radius="md" aria-hidden="true">{icon}</ThemeIcon>
      <Stack gap={2} miw={0}>
        <Text size="sm" fw={500}>{label}</Text>
        <Text component="p" m={0} fz={30} fw={800} lh={1.15}>
          {value === null ? "—" : formatter.number(value, format)}
        </Text>
        {delta !== undefined && <Group gap={6} wrap="wrap">
          <Group gap={2} wrap="nowrap" c={rising ? "var(--dashboard-up)" : "var(--dashboard-down)"}>
            {rising ? <IconArrowUpRight size={16} stroke={2.2} aria-hidden="true" /> : <IconArrowDownRight size={16} stroke={2.2} aria-hidden="true" />}
            <VisuallyHidden>{translate(rising ? "increase" : "decrease")}</VisuallyHidden>
            <Text span size="sm" fw={700}>{formatter.number(Math.abs(delta), { style: "percent", maximumFractionDigits: 0 })}</Text>
          </Group>
          {comparison && <Text span size="sm" c="dimmed">{comparison}</Text>}
        </Group>}
        {caption && <Text size="sm" c="dimmed">{caption}</Text>}
      </Stack>
    </Group>
  </Card>;
}
