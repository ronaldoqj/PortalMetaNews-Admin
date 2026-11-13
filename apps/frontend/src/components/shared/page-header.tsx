"use client";

import { Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Title } from "../ui/title";

/** The heading every administrative page opens with: its title, what it is for and, on the right, its main actions. */
export function PageHeader({ title, description, actions, id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; id?: string }) {
  return <Group justify="space-between" align="flex-start" gap="md">
    <Stack gap={4} miw={0} style={{ flex: "1 1 320px" }}>
      <Title order={2} id={id}>{title}</Title>
      {description && <Text size="sm" c="dimmed" maw={760}>{description}</Text>}
    </Stack>
    {actions && <Group gap="sm">{actions}</Group>}
  </Group>;
}
