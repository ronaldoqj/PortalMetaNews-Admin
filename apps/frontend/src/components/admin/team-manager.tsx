"use client";

import { Group, Stack, Tabs, Text } from "@mantine/core";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { I18nString } from "@/i18n/i18n-string";
import type { ApiResult } from "./api-result";
import { AvatarField, useAvatarSelection } from "./avatar-field";
import type { TemporaryCredentials } from "./contracts";
import { PERMISSIONS, type Permission } from "./permissions";
import { createUser, deleteRole, issueTemporaryPassword, removeUserAvatar, saveRole, updateUser } from "./team-actions";
import { isSystemRole, PERMISSION_GROUPS, permissionKey, type Role, type TeamUser } from "./team-contracts";
import {
  Button, Checkbox, DataView, EmptyState, FormModal, MemberAvatar, Section, StatusBadge, TemporaryCredentialsDialog, useConfirmation, useFormat, useListingView, type FormField,
} from "../ui";

type RoleValues = { name: string; description: string; permissions: string[] };
type UserValues = { name: string; email: string; roleId: string; enabled: boolean; jobTitle: I18nString; bio: I18nString; photo: string };

/** The refusals of the team's API, worded for the person (`code` from the API). */
const ERROR_CODES = ["email_taken", "role_system", "role_baseline", "role_in_use", "access_lockout", "role_not_found", "user_disabled"] as const;

/** Checkboxes of every permission, grouped by area, each with what it allows; the baseline of a system role stays ticked. */
function PermissionPicker({ value, onChange, locked, disabled }: { value: string[]; onChange: (value: string[]) => void; locked: readonly string[]; disabled: boolean }) {
  const t = useTranslations("Access");
  const toggle = (permission: Permission, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(permission); else next.delete(permission);
    onChange(PERMISSIONS.filter((item) => next.has(item)));
  };
  return <Stack gap="md">
    <Text size="sm" fw={500}>{t("permissionsTitle")}</Text>
    {PERMISSION_GROUPS.map((group) => <Stack key={group.key} gap={6}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.04em" }}>{t(`permissionGroups.${group.key}`)}</Text>
      {group.permissions.map((permission) => <Checkbox key={permission} checked={value.includes(permission)} disabled={disabled || locked.includes(permission)}
        onChange={(event) => toggle(permission, event.currentTarget.checked)}
        label={t(`permissions.${permissionKey(permission)}.label`)} description={t(`permissions.${permissionKey(permission)}.description`)} />)}
    </Stack>)}
  </Stack>;
}

/**
 * The newsroom's accounts and roles. Accounts get a temporary password shown once (handed over by a safe channel);
 * roles are named sets of permissions. The API refuses any change that would leave no enabled account able to
 * manage access, and system roles keep their name and baseline.
 */
export function TeamManager({ roles, users, currentUserId }: { roles: Role[]; users: TeamUser[]; currentUserId: string }) {
  const t = useTranslations("Access");
  const system = useTranslations("Roles.system");
  const locale = useLocale();
  const format = useFormat();
  const usersView = useListingView("team-users");
  const rolesView = useListingView("team-roles");
  const router = useRouter();
  const confirmation = useConfirmation();
  const photo = useAvatarSelection();
  const [tab, setTab] = useState<string | null>("users");
  const [role, setRole] = useState<Role | "new">();
  const [user, setUser] = useState<TeamUser | "new">();
  const [credentials, setCredentials] = useState<TemporaryCredentials>();
  const roleName = (item: Pick<Role, "slug" | "name" | "isSystem">) => item.isSystem && isSystemRole(item.slug) ? system(item.slug) : item.name;
  const errors = Object.fromEntries(ERROR_CODES.map((code) => [code, t(`errors.${code}`)]));
  const refresh = () => router.refresh();
  const editedRole = role && role !== "new" ? role : undefined;
  const editedUser = user && user !== "new" ? user : undefined;
  const self = editedUser?.id === currentUserId;
  const baseline = editedRole?.isSystem ? editedRole.permissions : [];

  const roleFields: FormField<RoleValues>[] = [
    { name: "name", type: "text", label: t("name"), required: true, maxLength: 120, disabled: editedRole?.isSystem, description: editedRole?.isSystem ? t("systemRoleHelp") : undefined },
    { name: "description", type: "textarea", label: t("roleDescription"), maxLength: 500, rows: 2, disabled: editedRole?.isSystem },
    { name: "permissions", type: "custom", label: t("permissionsTitle"), render: ({ value, onChange, disabled }) =>
      <PermissionPicker value={value as string[]} onChange={onChange} locked={baseline} disabled={disabled} /> },
  ];
  const userFields: FormField<UserValues>[] = [
    { name: "photo", type: "custom", label: t("photo"), when: () => !!editedUser, render: ({ onChange, disabled }) => editedUser
      ? <AvatarField member={editedUser} disabled={disabled}
        selection={{ ...photo, choose: (file) => { photo.choose(file); onChange(file?.name ?? ""); }, discard: () => { photo.discard(); onChange(""); } }}
        onRemove={() => confirmation.ask({ title: t("removePhotoTitle"), description: t("removePhotoWarning", { name: editedUser.name }), done: refresh,
          run: () => removeUserAvatar(editedUser.id) })} />
      : null },
    { name: "name", type: "text", label: t("name"), required: true, maxLength: 160 },
    { name: "email", type: "email", label: t("email"), required: true, maxLength: 254, disabled: !!editedUser, description: editedUser ? t("emailFixed") : t("newUserHelp") },
    { name: "roleId", type: "select", label: t("role"), required: true, disabled: self, description: self ? t("selfHelp") : undefined,
      options: roles.map((item) => ({ value: item.id, label: roleName(item) })) },
    { name: "enabled", type: "switch", label: t("enabled"), description: self ? t("selfHelp") : t("enabledHelp"), disabled: self, when: () => !!editedUser },
    { name: "jobTitle", type: "i18n", label: t("jobTitle"), maxLength: 120, when: () => !!editedUser },
    { name: "bio", type: "i18n", label: t("bio"), description: t("bioHelp"), maxLength: 1000, multiline: true, when: () => !!editedUser },
  ];
  const defaultRole = roles.find((item) => item.slug === "reporter")?.id ?? roles[0]?.id ?? "";

  return <Stack gap="lg">
    <Tabs value={tab} onChange={setTab} keepMounted={false}>
      <Tabs.List>
        <Tabs.Tab value="users" leftSection={<Users size={16} aria-hidden="true" />}>{t("usersTab")}</Tabs.Tab>
        <Tabs.Tab value="roles" leftSection={<ShieldCheck size={16} aria-hidden="true" />}>{t("rolesTab")}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="users" pt="lg">
        <Section title={t("usersTitle")} description={t("usersDescription")} icon={Users} flush
          actions={<>
            {users.length > 0 && usersView.toggle}
            <Button size="xs" leftSection={<Plus size={14} aria-hidden="true" />} onClick={() => { photo.discard(); setUser("new"); }}>{t("newUser")}</Button>
          </>}>
          <DataView rows={users} rowKey={(item) => item.id} minWidth={640} view={usersView.view} onOpen={(item) => { photo.discard(); setUser(item); }}
            empty={<EmptyState plain icon={Users} title={t("noUsers")} />}
            columns={[
              { key: "name", header: t("name"), card: "title", render: (item) => <Group gap="sm" wrap="nowrap">
                <MemberAvatar member={item} size={usersView.view === "grid" ? 48 : 36} />
                <Stack gap={0} miw={0}>
                  <Text size="sm" fw={600} truncate>{item.name || item.email}{item.id === currentUserId && <> <StatusBadge tone="info">{t("you")}</StatusBadge></>}</Text>
                  <Text size="xs" c="dimmed" truncate>{item.email}</Text>
                </Stack>
              </Group> },
              { key: "role", header: t("role"), render: (item) => { const found = roles.find((candidate) => candidate.id === item.roleId); return found ? roleName(found) : "—"; }, visibleFrom: "sm" },
              { key: "state", header: t("state"), card: "aside", render: (item) => item.requiresPasswordChange && item.enabled
                ? <StatusBadge tone="warning">{t("pendingFirstAccess")}</StatusBadge>
                : <StatusBadge tone={item.enabled ? "success" : "neutral"}>{t(item.enabled ? "active" : "inactive")}</StatusBadge> },
              { key: "news", header: t("news"), render: (item) => format.number(item.news), align: "right", visibleFrom: "md" },
              { key: "login", header: t("lastLogin"), render: (item) => item.lastLoginAt ? format.relative(item.lastLoginAt) : t("never"), visibleFrom: "md" },
            ]}
            actions={(item) => [
              { label: t("edit"), icon: Pencil, onClick: () => { photo.discard(); setUser(item); } },
              item.id !== currentUserId && item.enabled && { label: t("newPassword"), icon: KeyRound, onClick: () => confirmation.ask({
                title: t("newPasswordTitle"), description: t("newPasswordWarning", { name: item.name || item.email }), tone: "warning", errors,
                run: async () => { const result = await issueTemporaryPassword(item.id); if (result.ok) setCredentials(result.data.credentials); return result; }, done: refresh }) },
            ]} />
        </Section>
      </Tabs.Panel>
      <Tabs.Panel value="roles" pt="lg">
        <Section title={t("rolesTitle")} description={t("rolesDescription")} icon={UserCog} flush
          actions={<>
            {roles.length > 0 && rolesView.toggle}
            <Button size="xs" leftSection={<Plus size={14} aria-hidden="true" />} onClick={() => setRole("new")}>{t("newRole")}</Button>
          </>}>
          <DataView rows={roles} rowKey={(item) => item.id} minWidth={560} view={rolesView.view} onOpen={(item) => setRole(item)} empty={<EmptyState plain icon={ShieldCheck} title={t("noRoles")} />}
            columns={[
              { key: "name", header: t("name"), render: (item) => <Stack gap={2} miw={0}>
                <Group gap="xs"><Text size="sm" fw={600}>{roleName(item)}</Text><StatusBadge tone={item.isSystem ? "brand" : "neutral"}>{t(item.isSystem ? "system" : "custom")}</StatusBadge></Group>
                {(item.isSystem && isSystemRole(item.slug) ? t(`systemDescriptions.${item.slug}`) : item.description) &&
                  <Text size="xs" c="dimmed" lineClamp={2}>{item.isSystem && isSystemRole(item.slug) ? t(`systemDescriptions.${item.slug}`) : item.description}</Text>}
              </Stack> },
              { key: "permissions", header: t("permissionsTitle"), render: (item) => t("permissionCount", { count: item.permissions.length }), visibleFrom: "sm" },
              { key: "members", header: t("members"), render: (item) => t("memberCount", { count: item.members }), align: "right" },
            ]}
            actions={(item) => [
              { label: t("edit"), icon: Pencil, onClick: () => setRole(item) },
              !item.isSystem && { label: t("delete"), icon: Trash2, tone: "danger", onClick: () => confirmation.ask({
                title: t("deleteTitle"), description: t("deleteWarning", { name: item.name }), tone: "danger", errors, success: t("deleted"),
                run: () => deleteRole(item.id), done: refresh }) },
            ]} />
        </Section>
      </Tabs.Panel>
    </Tabs>

    <FormModal opened={!!role} onClose={() => setRole(undefined)} title={t(editedRole ? "editRole" : "newRole")} fields={roleFields} errors={errors} success={t("roleSaved")}
      initial={editedRole ? { name: roleName(editedRole), description: editedRole.isSystem && isSystemRole(editedRole.slug) ? t(`systemDescriptions.${editedRole.slug}`) : editedRole.description, permissions: editedRole.permissions }
        : { name: "", description: "", permissions: ["news:read"] }}
      onSubmit={async (values): Promise<ApiResult> => saveRole(editedRole?.isSystem
        // A system role keeps its stored name and description: only the permissions change.
        ? { name: editedRole.name, description: editedRole.description, permissions: values.permissions }
        : values, editedRole?.id)} />
    <FormModal opened={!!user} onClose={() => { photo.discard(); setUser(undefined); }} title={t(editedUser ? "editUser" : "newUser")} fields={userFields} errors={errors}
      success={editedUser ? t("userSaved") : undefined}
      initial={editedUser ? { name: editedUser.name, email: editedUser.email, roleId: editedUser.roleId, enabled: editedUser.enabled, jobTitle: editedUser.jobTitle, bio: editedUser.bio, photo: "" }
        : { name: "", email: "", roleId: defaultRole, enabled: true, jobTitle: {}, bio: {}, photo: "" }}
      onSubmit={async (values): Promise<ApiResult> => {
        if (!editedUser) {
          const created = await createUser({ name: values.name, email: values.email, roleId: values.roleId });
          if (created.ok) setCredentials(created.data.credentials);
          return created.ok ? { ok: true, data: null } : created;
        }
        const result = await updateUser(editedUser.id, self
          ? { name: values.name, jobTitle: values.jobTitle, bio: values.bio }
          : { name: values.name, roleId: values.roleId, enabled: values.enabled, jobTitle: values.jobTitle, bio: values.bio });
        if (result.ok && !(await photo.upload(`/${locale}/api/panel/users/${editedUser.id}/avatar`))) return { ok: false, error: "unavailable" };
        return result;
      }} />
    <TemporaryCredentialsDialog credentials={credentials} onClose={() => { setCredentials(undefined); refresh(); }} />
    {confirmation.dialog}
  </Stack>;
}

