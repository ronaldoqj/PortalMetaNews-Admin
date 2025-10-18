import { TextInput } from '@mantine/core';
import classes from './LayoutHeader.module.scss';

import { useDisclosure } from '@mantine/hooks';
import { AppShell, Burger,Group } from "@mantine/core";

export default function FormTextInput(props: React.ComponentProps<typeof TextInput>) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell.Header classNames={classes}>
      <Group h="100%" px="md">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        Header
      </Group>
    </AppShell.Header>
  );
}
