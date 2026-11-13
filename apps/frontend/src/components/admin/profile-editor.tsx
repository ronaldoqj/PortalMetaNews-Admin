"use client";

import { Badge, Group, Text } from "@mantine/core";
import { PenLine, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { I18nString } from "@/i18n/i18n-string";
import { AutoForm, useConfirmation, type FormField } from "../ui";
import { AvatarField, useAvatarSelection } from "./avatar-field";
import { removeOwnAvatar, updateProfile } from "./team-actions";
import { profileSchema, type TeamUser } from "./team-contracts";

type Values = { name: string; jobTitle: I18nString; bio: I18nString; photo: string; email: string };

/**
 * The signed-in account's own data: name, photo and the author profile the site shows beside bylines and on the
 * author's page (job title and short bio, in both languages). The e-mail and the role are shown, never edited here:
 * they belong to whoever manages the team.
 */
export function ProfileEditor({ profile, roleLabel }: { profile: TeamUser; roleLabel: string }) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const photo = useAvatarSelection();
  const confirmation = useConfirmation();
  const fields: Array<FormField<Values>> = [
    { name: "photo", type: "custom", label: t("photo.label"), wide: true, render: ({ onChange, disabled }) => <AvatarField member={profile} disabled={disabled}
      selection={{ ...photo, choose: (file) => { photo.choose(file); onChange(file?.name ?? ""); }, discard: () => { photo.discard(); onChange(""); } }}
      onRemove={() => confirmation.ask({ title: t("photo.removeTitle"), description: t("photo.removeWarning"), success: t("photo.removed"), done: () => router.refresh(),
        run: removeOwnAvatar })} /> },
    { name: "name", type: "text", label: t("name"), required: true, maxLength: 160 },
    { name: "email", type: "text", label: t("email"), description: t("emailHelp"), disabled: true },
    { name: "jobTitle", type: "i18n", label: t("jobTitle"), description: t("jobTitleHelp"), maxLength: 120 },
    { name: "bio", type: "i18n", label: t("bio"), description: t("bioHelp"), maxLength: 1000, multiline: true },
  ];
  return <><AutoForm<Values> layout="page" fields={fields} schema={profileSchema.extend({ photo: z.string().optional(), email: z.string().optional() })} success={t("saved")}
    sections={[
      { title: t("account"), description: t("accountHelp"), icon: UserRound, fields: ["photo", "name", "email"] },
      { title: t("author"), description: t("authorHelp"), icon: PenLine, fields: ["jobTitle", "bio"] },
    ]}
    initial={{ name: profile.name, jobTitle: profile.jobTitle, bio: profile.bio, photo: "", email: profile.email }}
    onSubmit={async (values) => {
      const result = await updateProfile({ name: values.name, jobTitle: values.jobTitle, bio: values.bio });
      if (result.ok && !(await photo.upload(`/${locale}/api/panel/profile/avatar`))) return { ok: false, error: "unavailable" };
      return result;
    }}>
    <Group gap="xs"><Text size="sm" c="dimmed">{t("role")}:</Text><Badge variant="light" tt="none">{roleLabel}</Badge></Group>
  </AutoForm>{confirmation.dialog}</>;
}
