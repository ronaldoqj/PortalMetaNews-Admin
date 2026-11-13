"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPathname } from "../../i18n/navigation";
import { routing, type AppLocale } from "../../i18n/routing";
import {
  firstAccessSchema, initialSetupSchema, loginResponseSchema, loginResultSchema, loginSchema, strongPasswordSchema,
} from "../admin/contracts";
import {
  adminApi, AdminApiError, assertPanelSurface, PASSWORD_CHANGE_COOKIE, PASSWORD_CHANGE_COOKIE_SECONDS, requirePendingPasswordChange,
  SESSION_COOKIE, SESSION_COOKIE_SECONDS, sessionCookieOptions,
} from "../admin/server";

export type AuthError =
  | "invalidInput" | "invalidCredentials" | "forbidden" | "unavailable" | "passwordMismatch" | "passwordPolicy" | "passwordReused"
  | "passwordChangeExpired" | "rateLimited" | "alreadyInstalled" | "setupRefused";
export type AuthState = { error?: AuthError };

const validLocale = (locale: string): locale is AppLocale => routing.locales.some((candidate) => candidate === locale);

function failure(error: unknown): AuthState {
  if (error instanceof AdminApiError) {
    if (error.status === 401) return { error: "invalidCredentials" };
    if (error.status === 403) return { error: "forbidden" };
    if (error.status === 400) return { error: "invalidInput" };
    if (error.status === 429) return { error: "rateLimited" };
  }
  return { error: "unavailable" };
}

/**
 * Signs in. A temporary password yields no session: the restricted token goes into its own short-lived HttpOnly
 * cookie (never the URL) and the visitor is sent to the first-access page.
 */
export async function login(locale: string, _state: AuthState, form: FormData): Promise<AuthState> {
  if (!validLocale(locale)) return { error: "invalidInput" };
  const input = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!input.success) return { error: "invalidInput" };
  let firstAccess = false;
  try {
    await assertPanelSurface();
    const response = loginResultSchema.parse(await adminApi("auth/login", undefined, "POST", input.data));
    if ("temporaryToken" in response) {
      (await cookies()).set(PASSWORD_CHANGE_COOKIE, response.temporaryToken, sessionCookieOptions(PASSWORD_CHANGE_COOKIE_SECONDS));
      firstAccess = true;
    } else {
      (await cookies()).set(SESSION_COOKIE, response.token, sessionCookieOptions(SESSION_COOKIE_SECONDS));
    }
  } catch (error) { return failure(error); }
  redirect(getPathname({ href: firstAccess ? "/panel/first-access" : "/panel/dashboard", locale }));
}

/** Installs the panel: the first account (Administrador), accepted by the API only while none exists. */
export async function install(locale: string, _state: AuthState, form: FormData): Promise<AuthState> {
  if (!validLocale(locale)) return { error: "invalidInput" };
  const input = initialSetupSchema.safeParse({
    name: form.get("name"), email: form.get("email"), password: form.get("password"), confirmation: form.get("confirmation"),
    setupToken: form.get("setupToken") || undefined,
  });
  if (!input.success) return { error: form.get("password") !== form.get("confirmation") ? "passwordMismatch" : "invalidInput" };
  if (!strongPasswordSchema.safeParse(input.data.password).success) return { error: "passwordPolicy" };
  try {
    await assertPanelSurface();
    const { name, email, password, setupToken } = input.data;
    const grant = loginResponseSchema.parse(await adminApi("auth/initial-setup", undefined, "POST", { name, email, password, setupToken }));
    (await cookies()).set(SESSION_COOKIE, grant.token, sessionCookieOptions(SESSION_COOKIE_SECONDS));
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 409) return { error: "alreadyInstalled" };
    if (error instanceof AdminApiError && error.status === 403) return { error: "setupRefused" };
    if (error instanceof AdminApiError && error.status === 400) return { error: "passwordPolicy" };
    return { error: "unavailable" };
  }
  redirect(getPathname({ href: "/panel/dashboard", locale }));
}

/** Replaces the temporary password; the API then opens the real session and the restricted cookie is dropped. */
export async function completeFirstAccess(locale: string, _state: AuthState, form: FormData): Promise<AuthState> {
  if (!validLocale(locale)) return { error: "invalidInput" };
  const input = firstAccessSchema.safeParse({ password: form.get("password"), confirmation: form.get("confirmation") });
  if (!input.success) return { error: form.get("password") !== form.get("confirmation") ? "passwordMismatch" : "invalidInput" };
  if (!strongPasswordSchema.safeParse(input.data.password).success) return { error: "passwordPolicy" };
  const temporaryToken = await requirePendingPasswordChange();
  try {
    const grant = loginResponseSchema.parse(await adminApi("auth/force-password-change", undefined, "POST", { temporaryToken, newPassword: input.data.password }));
    const jar = await cookies();
    jar.delete(PASSWORD_CHANGE_COOKIE);
    jar.set(SESSION_COOKIE, grant.token, sessionCookieOptions(SESSION_COOKIE_SECONDS));
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 409) return { error: "passwordReused" };
    if (error instanceof AdminApiError && error.status === 400) return { error: "passwordPolicy" };
    if (error instanceof AdminApiError && error.status === 401) return { error: "passwordChangeExpired" };
    return { error: "unavailable" };
  }
  redirect(getPathname({ href: "/panel/dashboard", locale }));
}

/** Ends the session on the API and forgets the cookie, whatever the API answers. */
export async function logout(locale: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await adminApi("auth/session", token, "DELETE").catch(() => undefined);
  jar.delete(SESSION_COOKIE);
  redirect(getPathname({ href: "/panel/login", locale: validLocale(locale) ? locale : routing.defaultLocale }));
}
