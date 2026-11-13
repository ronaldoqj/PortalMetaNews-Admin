import type { ReactNode } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { Card } from "../ui/card";
import { Title } from "../ui/title";

export interface DashboardPanelProps {
  title: string;
  /** What the block counts, such as "Reports received in the period", so blocks with different bases are not compared. */
  description?: string;
  /** Controls beside the title: a range select, a "see all" link. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One bordered dashboard block: a titled section that fills its grid cell. */
export function DashboardPanel({ title, description, action, children, className }: DashboardPanelProps) {
  return <Card component="section" aria-label={title} withBorder radius="md" p="lg" className={["dashboard-panel", className].filter(Boolean).join(" ")}>
    <Stack gap="md" h="100%">
      <Group justify="space-between" align="center" gap="sm" wrap="wrap">
        <Stack gap={2} miw={0}>
          <Title order={3} size="h4">{title}</Title>
          {description && <Text size="xs" c="dimmed">{description}</Text>}
        </Stack>
        {action}
      </Group>
      {children}
    </Stack>
  </Card>;
}
