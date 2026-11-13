"use client";

import { Menu, useMantineColorScheme, type MantineColorScheme } from "@mantine/core";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionIcon } from "../ui/button";
import { Tooltip } from "./dialog";

const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "auto", icon: Monitor },
] as const satisfies ReadonlyArray<{ value: MantineColorScheme; icon: typeof Sun }>;

/**
 * Light, dark or system scheme for every surface. The trigger shows both glyphs and lets CSS pick the
 * one of the rendered scheme, so the server markup is identical whatever the preference is.
 */
export function ColorSchemeToggle() {
  const translate = useTranslations("ColorScheme");
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const label = translate("label");
  return <Menu position="bottom-end" withinPortal>
    <Tooltip label={label}>
      <Menu.Target>
        <ActionIcon variant="default" size="lg" radius="xl" aria-label={label} className="color-scheme-toggle">
          <Sun size={17} className="color-scheme-toggle-light" aria-hidden="true" />
          <Moon size={17} className="color-scheme-toggle-dark" aria-hidden="true" />
        </ActionIcon>
      </Menu.Target>
    </Tooltip>
    <Menu.Dropdown>
      {OPTIONS.map(({ value, icon: Icon }) => <Menu.Item
        key={value} leftSection={<Icon size={16} aria-hidden="true" />} onClick={() => setColorScheme(value)}
        aria-current={colorScheme === value ? "true" : undefined} fw={colorScheme === value ? 700 : undefined}
      >
        {translate(value)}
      </Menu.Item>)}
    </Menu.Dropdown>
  </Menu>;
}
