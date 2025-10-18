
import { TextInput } from '@mantine/core';
import { AppShell, ScrollArea, NavLink } from "@mantine/core";
import classes from './LayoutNav.module.scss';
export default function FormTextInput(props: React.ComponentProps<typeof TextInput>) {

  return (
    <AppShell.Navbar classNames={classes}>
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
  );
}
