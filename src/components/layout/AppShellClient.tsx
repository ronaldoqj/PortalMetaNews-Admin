"use client";

import { AppShell, Burger, MantineProvider, Group, ScrollArea, NavLink } from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import React from "react";
import LocaleSwitcher from '../layout/header/LocaleSwitcher';

export default function AppShellClient({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            Header
          <LocaleSwitcher />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <AppShell.Section p="md">Navbar header</AppShell.Section>
        <AppShell.Section grow my="md" component={ScrollArea} px="md">
          <p>60 links in a scrollable section:</p>
          {Array(60)
            .fill(0)
            .map((_, index) => (
              <NavLink
                href="#"
                key={index}
                onClick={(event: React.MouseEvent) => event.preventDefault()}
                label="Navbar link"
              />
            ))}
        </AppShell.Section>
        <AppShell.Section p="md">Navbar footer – always at the bottom</AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <MantineProvider>
          {children}
        </MantineProvider>
      </AppShell.Main>
    </AppShell>
  );
}
