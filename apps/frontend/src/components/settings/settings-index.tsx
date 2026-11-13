"use client";

import { SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { Bot, FileText, Globe, HardDrive, Mail, Palette, SwatchBook, UsersRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import type { StaticRoute } from "../layout/area-navigation";
import type { Permission } from "../admin/permissions";
import { Card } from "../ui/card";
import { EmptyState } from "../ui";

const ENTRIES: ReadonlyArray<{ key: string; href: StaticRoute; icon: LucideIcon; permission: Permission }> = [
  { key: "ai", href: "/panel/settings/ai", icon: Bot, permission: "settings:manage" },
  { key: "email", href: "/panel/settings/email", icon: Mail, permission: "settings:manage" },
  { key: "storage", href: "/panel/settings/storage", icon: HardDrive, permission: "settings:manage" },
  { key: "site", href: "/panel/settings/site", icon: Globe, permission: "site:manage" },
  { key: "themes", href: "/panel/themes", icon: SwatchBook, permission: "themes:manage" },
  { key: "branding", href: "/panel/branding", icon: Palette, permission: "themes:manage" },
  { key: "legal", href: "/panel/site/privacy", icon: FileText, permission: "site:manage" },
  { key: "access", href: "/panel/access", icon: UsersRound, permission: "users:manage" },
];

/** The settings the account may open, as cards: the integrations first, then the site and the team. */
export function SettingsIndex({ permissions }: { permissions: readonly Permission[] }) {
  const t = useTranslations("Settings");
  const visible = ENTRIES.filter((entry) => permissions.includes(entry.permission));
  if (!visible.length) return <EmptyState icon={Globe} title={t("empty")} />;
  return <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
    {visible.map(({ key, href, icon: Icon }) => <Card key={key} withBorder radius="lg" p="lg" component={Link} href={href} className="app-card-link">
      <Stack gap="sm">
        <ThemeIcon variant="light" size={40} radius="md" aria-hidden="true"><Icon size={20} /></ThemeIcon>
        <Text fw={700}>{t(`entries.${key}.title`)}</Text>
        <Text size="sm" c="dimmed">{t(`entries.${key}.description`)}</Text>
      </Stack>
    </Card>)}
  </SimpleGrid>;
}
