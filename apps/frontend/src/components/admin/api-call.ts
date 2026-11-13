import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { Actor } from "./contracts";
import { hasAnyPermission, type Permission } from "./permissions";
import { adminApi, AdminApiError, getPanelSession } from "./server";
import type { ApiFailure, ApiResult } from "./api-result";

/**
 * The one way a page or a server action of the panel talks to the API: it reads the session from its HttpOnly cookie
 * (never from an argument), checks the permission the interface relies on (the API checks it again), validates the
 * answer against its contract and turns every refusal into an `ApiResult`, so callers never handle exceptions.
 *
 * This module is server-only and is NOT a `"use server"` module: its functions take an API path, so they must never be
 * reachable from the browser. Server actions wrap them with a fixed path and validated input.
 */

function refusalCode(body: unknown): string | undefined {
  const code = body && typeof body === "object" ? (body as { code?: unknown }).code : undefined;
  return typeof code === "string" && code.length <= 80 ? code : undefined;
}

export function apiFailure(error: unknown): ApiFailure {
  if (!(error instanceof AdminApiError)) return { ok: false, error: "unavailable" };
  const code = refusalCode(error.body);
  const failure = (kind: ApiFailure["error"]): ApiFailure => (code ? { ok: false, error: kind, code } : { ok: false, error: kind });
  switch (error.status) {
    case 400: case 422: return failure("invalidInput");
    case 401: case 403: return failure("forbidden");
    case 404: return failure("notFound");
    case 409: return failure("conflict");
    case 413: return failure("tooLarge");
    case 415: return failure("unsupportedType");
    case 429: return failure("rateLimited");
    default: return failure("unavailable");
  }
}

export type ApiCallOptions<Data> = {
  /** Holding any of these lets the call through (none named: every signed-in account). */
  permission?: Permission | readonly Permission[];
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** The contract of the answer; without one the answer is dropped and `data` is `null`. */
  schema?: z.ZodType<Data>;
  /** After a change: drops the cached render of every page, so lists and counters are read again. */
  revalidate?: boolean;
  /** For calls that wait for the language model; ten seconds otherwise. */
  timeoutMs?: number;
};

/** A call of the panel's API (`/panel/...`, `/auth/...`), as the signed-in account. */
export async function panelApi<Data = null>(path: string, { permission, method = "GET", body, schema, revalidate = false, timeoutMs }: ApiCallOptions<Data> = {}): Promise<ApiResult<Data>> {
  const session = await getPanelSession();
  if (session.kind !== "authenticated") return { ok: false, error: session.kind === "unavailable" ? "unavailable" : "forbidden" };
  const permissions = permission === undefined ? [] : typeof permission === "string" ? [permission] : permission;
  if (!hasAnyPermission(session.actor, permissions)) return { ok: false, error: "forbidden" };
  try {
    const answer = await adminApi(path, session.token, method, body, undefined, timeoutMs);
    if (revalidate) revalidatePath("/[locale]", "layout");
    if (!schema) return { ok: true, data: null as Data };
    const parsed = schema.safeParse(answer);
    // An answer outside its contract is a deployment mismatch, never data to show.
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "unavailable" };
  } catch (error) {
    return apiFailure(error);
  }
}

/** The signed-in account, for pages that adapt to its permissions; null outside a session. */
export async function currentActor(): Promise<Actor | null> {
  const session = await getPanelSession();
  return session.kind === "authenticated" ? session.actor : null;
}

/** `path?name=value` with the empty, `undefined` and `null` values left out; arrays repeat the name. */
export function withQuery(path: string, query: Record<string, string | number | boolean | readonly string[] | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") for (const item of value) params.append(name, item);
    else params.set(name, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}
