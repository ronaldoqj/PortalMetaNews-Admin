"use client";

import { Alert, Stack, Text } from "@mantine/core";
import { KeyRound, LogIn, Rocket, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Link } from "../../i18n/navigation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { PasswordInput, TextInput } from "../ui/forms/input";
import { Title } from "../ui/title";
import { completeFirstAccess, install, login, type AuthState } from "./actions";

/** The panel's sign-in. Recovery by e-mail is not offered: whoever manages the team issues a temporary password. */
export function LoginForm({ error }: { error?: "forbidden" | "unavailable" }) {
  const translate = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(login.bind(null, locale), {} as AuthState);
  const failure = state.error ?? error;
  return <Card component="section" withBorder p="xl" maw={440} w="100%" radius="md">
    <form action={action}>
      <Stack gap="md">
        <Title order={1} size="h3">{translate("title")}</Title>
        {failure && <Alert color="red" role="alert">{translate(`errors.${failure}`)}</Alert>}
        <TextInput name="email" label={translate("email")} type="email" required autoComplete="username" maxLength={254} />
        <PasswordInput name="password" label={translate("password")} required autoComplete="current-password" minLength={12} maxLength={128} />
        <Button type="submit" loading={pending} leftSection={<LogIn size={16} aria-hidden="true" />}>{translate("enter")}</Button>
        <Text size="sm" c="dimmed">{translate("recoveryHint")}</Text>
      </Stack>
    </form>
  </Card>;
}

/** Shown on the sign-in page while no account exists: creates the first administrator and signs them in. */
export function InstallForm({ tokenRequired }: { tokenRequired: boolean }) {
  const translate = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(install.bind(null, locale), {} as AuthState);
  return <Card component="section" withBorder p="xl" maw={480} w="100%" radius="md">
    <form action={action}>
      <Stack gap="md">
        <Title order={1} size="h3">{translate("setup.title")}</Title>
        <Text size="sm" c="dimmed">{translate("setup.description")}</Text>
        {state.error && <Alert color="red" role="alert">{translate(state.error in SETUP_ERRORS ? `setup.errors.${state.error}` : "setup.errors.unavailable")}</Alert>}
        <TextInput name="name" label={translate("setup.name")} required maxLength={160} autoComplete="name" />
        <TextInput name="email" label={translate("email")} type="email" required maxLength={254} autoComplete="username" />
        <PasswordInput name="password" label={translate("password")} required minLength={12} maxLength={128} autoComplete="new-password" description={translate("passwordRequirements")} />
        <PasswordInput name="confirmation" label={translate("setup.confirmation")} required minLength={12} maxLength={128} autoComplete="new-password" />
        {tokenRequired && <PasswordInput name="setupToken" label={translate("setup.token")} description={translate("setup.tokenHelp")} required maxLength={256} autoComplete="off" />}
        <Button type="submit" loading={pending} leftSection={<Rocket size={16} aria-hidden="true" />}>{translate("setup.submit")}</Button>
      </Stack>
    </form>
  </Card>;
}

const SETUP_ERRORS = { invalidInput: true, passwordMismatch: true, passwordPolicy: true, alreadyInstalled: true, setupRefused: true, unavailable: true } as const;

/** Mandatory replacement of a temporary password before the first session. */
export function FirstAccessForm() {
  const translate = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(completeFirstAccess.bind(null, locale), {} as AuthState);
  return <Card withBorder p="xl" radius="md" maw={480} w="100%">
    <form action={action}>
      <Stack gap="md">
        <Title order={1} size="h3">{translate("firstAccessTitle")}</Title>
        <Alert color="yellow" icon={<ShieldAlert size={18} aria-hidden="true" />}>{translate("firstAccessNotice")}</Alert>
        {state.error && <Alert color="red" role="alert">{translate(`errors.${state.error}`)}</Alert>}
        <PasswordInput name="password" label={translate("newPassword")} required minLength={12} maxLength={128} autoComplete="new-password" />
        <PasswordInput name="confirmation" label={translate("confirmPassword")} required minLength={12} maxLength={128} autoComplete="new-password" />
        <Text size="sm" c="dimmed">{translate("passwordRequirements")}</Text>
        <Button type="submit" loading={pending} leftSection={<KeyRound size={16} aria-hidden="true" />}>{translate("firstAccessSubmit")}</Button>
        {state.error === "passwordChangeExpired" && <Link href="/panel/login">{translate("backToLogin")}</Link>}
      </Stack>
    </form>
  </Card>;
}
