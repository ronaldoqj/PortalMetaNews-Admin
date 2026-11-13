import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getPathname } from "../../i18n/navigation";
import { resolveHostContext } from "../../theme/host-context";
import { siteDomain } from "../../config/site-hosts";
import { AdminApiError, backendUrl } from "./backend-url";
import { actorSchema, tokenSchema, type Actor } from "./contracts";

export { AdminApiError, backendUrl } from "./backend-url";

/** The panel's session cookie: host-only, HttpOnly, never readable by the page's scripts. */
export const SESSION_COOKIE = "pmn-panel";
/** Holds only the restricted first-access token; it never authenticates any page. */
export const PASSWORD_CHANGE_COOKIE = "pmn-panel-password-change";
export const PASSWORD_CHANGE_COOKIE_SECONDS = 15 * 60;
export const SESSION_COOKIE_SECONDS = 12 * 60 * 60;

/** Host-only (no `Domain`), so the site never receives it. The path is the whole host, so switching the language keeps it. */
export function sessionCookieOptions(maxAge: number) {
  const local = siteDomain() === "localhost";
  return { httpOnly: true, sameSite: local ? "lax" as const : "strict" as const, secure: !local, path: "/", maxAge };
}

/** Calls that wait for the language model (a translation, an image) take longer than an ordinary read. */
export const SLOW_API_TIMEOUT_MS = 150_000;

export async function adminApi(
  path: string, token?: string, method = "GET", body?: unknown, extraHeaders?: Record<string, string>, timeoutMs = 10_000,
): Promise<unknown> {
  const target = backendUrl(path);
  const requestHeaders: Record<string, string> = { ...extraHeaders };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(target, {
      method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeoutMs),
    });
  } catch { throw new AdminApiError(503); }
  if (!response.ok) throw new AdminApiError(response.status, await response.json().catch(() => undefined));
  if (response.status === 204) return null;
  try { return await response.json(); } catch { throw new AdminApiError(503); }
}

/** The page is being served on the panel's own host; a session never travels to the site. */
export async function assertPanelSurface(): Promise<void> {
  const requestHeaders = await headers();
  const context = resolveHostContext(requestHeaders.get("x-pmn-host") ?? "", requestHeaders.get("x-pmn-path") ?? "", siteDomain());
  if (context.surface !== "panel") throw new AdminApiError(403);
}

type SessionState = { kind: "authenticated"; actor: Actor; token: string } | { kind: "anonymous" | "forbidden" | "unavailable" };

export const getPanelSession = cache(async (): Promise<SessionState> => {
  try {
    await assertPanelSurface();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return { kind: "anonymous" };
    const parsed = actorSchema.safeParse(await adminApi("auth/session", token));
    if (!parsed.success) return { kind: "unavailable" };
    return { kind: "authenticated", actor: parsed.data, token };
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 401) return { kind: "anonymous" };
    if (error instanceof AdminApiError && error.status === 403) return { kind: "forbidden" };
    return { kind: "unavailable" };
  }
});

async function pendingPasswordChange(): Promise<string | null> {
  const parsed = tokenSchema.safeParse((await cookies()).get(PASSWORD_CHANGE_COOKIE)?.value);
  return parsed.success ? parsed.data : null;
}

/** Protected layouts render only with a full session; a pending temporary password leads to the first-access page. */
export async function requirePanelSession() {
  const session = await getPanelSession();
  if (session.kind === "authenticated") return session;
  const locale = await getLocale();
  if (session.kind === "anonymous" && await pendingPasswordChange()) redirect(getPathname({ locale, href: "/panel/first-access" }));
  const target = getPathname({ locale, href: "/panel/login" });
  redirect(session.kind === "anonymous" ? target : `${target}?error=${session.kind}`);
}

/** The first-access screen exists only on the panel's host and while a change is pending. */
export async function requirePendingPasswordChange(): Promise<string> {
  try {
    await assertPanelSurface();
  } catch {
    notFound();
  }
  const token = await pendingPasswordChange();
  if (token) return token;
  redirect(getPathname({ locale: await getLocale(), href: "/panel/login" }));
}
