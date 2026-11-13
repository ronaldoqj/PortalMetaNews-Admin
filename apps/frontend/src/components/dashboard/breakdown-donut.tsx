"use client";

import { DonutChart } from "@mantine/charts";
import { Box, ColorSwatch, Group, Stack, Text } from "@mantine/core";
import { useFormatter } from "next-intl";
import { formatStorage } from "../ui/format";

export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  /** Mantine colour or CSS colour, such as `var(--dashboard-series-1)`. */
  color: string;
}

export interface BreakdownDonutProps {
  items: BreakdownItem[];
  /** Unit under the total in the centre, already pluralised ("reports"). */
  centerLabel: string;
  /** Accessible name of the chart. */
  label: string;
  /** What the values count: items (default) or stored bytes, shown in their largest readable unit. */
  unit?: "count" | "bytes";
}

/**
 * Donut with the total in its centre and a legend listing every slice with its count and share, so no
 * slice is identified by colour alone. Below about 380px of panel width the legend drops under the ring.
 */
export function BreakdownDonut({ items, centerLabel, label, unit = "count" }: BreakdownDonutProps) {
  const formatter = useFormatter();
  const amount = (value: number) => unit === "bytes"
    ? formatStorage(value, (scaled, options) => formatter.number(scaled, options)) : formatter.number(value);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const share = (value: number) => formatter.number(total ? value / total : 0, { style: "percent", maximumFractionDigits: 0 });
  return <div className="dashboard-breakdown">
    <Box pos="relative" w={176} h={176} style={{ flexShrink: 0 }} role="figure" aria-label={label}>
      <DonutChart data={items.map(({ label: name, value, color }) => ({ name, value, color }))} size={176} thickness={30}
        paddingAngle={2} strokeWidth={0} tooltipDataSource="segment" valueFormatter={(value) => `${amount(value)} · ${share(value)}`} />
      <Stack gap={0} align="center" justify="center" pos="absolute" inset={0} style={{ pointerEvents: "none" }} aria-hidden="true">
        <Text fz={unit === "bytes" ? 22 : 28} fw={800} lh={1.1}>{amount(total)}</Text>
        <Text size="sm" c="dimmed">{centerLabel}</Text>
      </Stack>
    </Box>
    <Box component="ul" m={0} p={0} style={{ listStyle: "none", flex: 1, minWidth: 0, alignSelf: "stretch" }}>
      {items.map((item, index) => <Group component="li" key={item.key} gap="sm" wrap="nowrap" py={8}
        style={index < items.length - 1 ? { borderBottom: "1px solid var(--mantine-color-default-border)" } : undefined}>
        <ColorSwatch color={item.color} size={12} withShadow={false} aria-hidden="true" />
        <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate="end">{item.label}</Text>
        <Text size="sm" fw={700} ta="right" miw={32} style={{ whiteSpace: "nowrap" }}>{amount(item.value)}</Text>
        <Text size="sm" c="dimmed" ta="right" miw={40}>{share(item.value)}</Text>
      </Group>)}
    </Box>
  </div>;
}
