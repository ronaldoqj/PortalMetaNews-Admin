"use client";

import { Avatar, type AvatarProps } from "@mantine/core";
import { useLocale } from "next-intl";
import { avatarUrl } from "../admin/avatar-urls";
import { initialsOf } from "../layout/user-menu";

/**
 * An account's photo, or their initials without one. `src` overrides the stored photo, for a
 * local preview of a selection that is not saved yet.
 */
export function MemberAvatar({ member, src, ...props }: {
  member: { id: string; name: string; email: string; avatarVersion?: string | null };
  src?: string;
} & Omit<AvatarProps, "src" | "children">) {
  const locale = useLocale();
  const photo = src ?? avatarUrl(locale, member.id, member.avatarVersion);
  return <Avatar color="brand" variant="light" radius="xl" alt="" src={photo} {...props}>
    {initialsOf(member)}
  </Avatar>;
}
