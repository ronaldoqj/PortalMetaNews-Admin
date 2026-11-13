"use client";

import { Group, Menu, MenuDropdown, MenuItem, MenuTarget, Text, UnstyledButton } from "@mantine/core";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { AppLocale } from "../../i18n/routing";

export type LocaleOption = { locale: AppLocale; label: string; name: string; href: string };

/**
 * Discreet language switcher. Each option is a plain link to the localized address of the same page, resolved by the
 * caller; the query (filters, a page number) is carried over when `preserveQuery`. Switching reloads the page in the
 * other catalog, and next-intl's cookie remembers the choice.
 */
export function LocaleMenu({ current, options, label, preserveQuery = false }: {
  current: string; options: LocaleOption[]; label: string; preserveQuery?: boolean;
}) {
  const searchParams = useSearchParams();
  const suffix = preserveQuery && searchParams.size > 0 ? `?${searchParams}` : "";
  const active = options.find((option) => option.locale === current);
  return <Menu position="bottom-end" shadow="md" radius="md" width="max-content" withinPortal>
    <MenuTarget>
      <UnstyledButton aria-label={label} title={label} className="locale-trigger">
        <Group gap={6} wrap="nowrap">
          <Languages size={18} strokeWidth={1.6} aria-hidden="true" />
          <Text size="sm" fw={600} className="portal-locale-code">{active?.label ?? current}</Text>
          <ChevronDown size={14} aria-hidden="true" className="portal-locale-chevron" />
        </Group>
      </UnstyledButton>
    </MenuTarget>
    <MenuDropdown>
      {options.map((option) => <MenuItem key={option.locale} component="a" href={`${option.href}${suffix}`} hrefLang={option.locale} lang={option.locale}
        aria-current={option === active ? "true" : undefined} rightSection={option === active ? <Check size={14} aria-hidden="true" /> : null}>
        <Group gap="xs" wrap="nowrap"><Text size="sm" fw={600} miw={32}>{option.label}</Text><Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{option.name}</Text></Group>
      </MenuItem>)}
    </MenuDropdown>
  </Menu>;
}
