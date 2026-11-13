"use client";

import { Avatar, Group, Menu, MenuDivider, MenuDropdown, MenuItem, MenuLabel, MenuTarget, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronDown, LogOut, UserPen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { avatarUrl } from "../admin/avatar-urls";

/** Who is signed in, as the header shows them: name (or the e-mail when blank), role and, when there is one, photo. */
export type SignedInUser = { id: string; name: string; email: string; role: string; avatarVersion: string | null };

/** Up to two initials, from the first and last words of the name (or the e-mail when it is blank). */
export function initialsOf({ name, email }: Pick<SignedInUser, "name" | "email">): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length ? [words[0], words.length > 1 ? words[words.length - 1] : ""] : [email];
  return letters.map((word) => word.charAt(0)).join("").toLocaleUpperCase();
}

/** The account area of the header: avatar, name and role open a menu with the e-mail, the profile and sign-out. */
export function UserMenu({ user, logout }: { user: SignedInUser; logout: () => Promise<void> }) {
  const translate = useTranslations("Auth");
  const locale = useLocale();
  const name = user.name.trim() || user.email;
  return <Menu position="bottom-end" shadow="md" radius="md" width={240} withinPortal>
    <MenuTarget>
      <UnstyledButton aria-label={translate("accountMenu", { name })} className="panel-user-menu">
        <Group gap="sm" wrap="nowrap">
          <Avatar color="brand" variant="filled" radius="xl" size={38} aria-hidden="true" src={avatarUrl(locale, user.id, user.avatarVersion)} alt="">{initialsOf(user)}</Avatar>
          <Stack gap={0} visibleFrom="sm" maw={200}>
            <Text size="sm" fw={600} lh={1.3} truncate="end">{name}</Text>
            {user.role && <Text size="xs" c="dimmed" lh={1.3} truncate="end">{user.role}</Text>}
          </Stack>
          <ChevronDown size={16} aria-hidden="true" />
        </Group>
      </UnstyledButton>
    </MenuTarget>
    <MenuDropdown>
      <MenuLabel style={{ overflowWrap: "anywhere" }}>{user.email}</MenuLabel>
      <MenuDivider />
      <MenuItem component={Link} href="/panel/profile" leftSection={<UserPen size={15} aria-hidden="true" />}>{translate("editProfile")}</MenuItem>
      <form action={logout}>
        <MenuItem component="button" type="submit" leftSection={<LogOut size={15} aria-hidden="true" />}>{translate("logout")}</MenuItem>
      </form>
    </MenuDropdown>
  </Menu>;
}
