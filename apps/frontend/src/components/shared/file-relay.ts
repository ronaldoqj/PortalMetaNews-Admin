import "server-only";

import type { NextRequest } from "next/server";
import { AdminApiError, adminApi, backendUrl, SESSION_COOKIE } from "../admin/server";
import { actorSchema, type Actor } from "../admin/contracts";
import { routing } from "../../i18n/routing";
import { resolveHostContext } from "../../theme/host-context";
import { siteDomain } from "../../config/site-hosts";
import { relayErrorFromStatus, type RelayError } from "./file-transfer";

/**
 * Transport for file bytes and long-lived streams (media uploads, brand images, photos, the AI writer's answers). These
 * handlers live under `/<locale>/api/` (and `/media`, `/brand-assets`) and are excluded from `proxy.ts`, because the
 * proxy buffers request bodies and would hold a stream until it ends. Without the proxy, `x-pmn-*` headers are
 * client-controlled, so the host is always re-resolved here from `Host`. Only explicit headers are forwarded upstream:
 * never the visitor's IP address, User-Agent, cookies or referrer.
 */

const UPLOAD_TIMEOUT_MS = 15 * 60 * 1000;
const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000;
/** Multipart framing and text fields around a single file; a larger body is refused before streaming. */
export const MULTIPART_OVERHEAD_BYTES = 256 * 1024;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-transform",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
} as const;

export function relayFailure(error: RelayError, status: number, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status, headers: PRIVATE_HEADERS });
}

/** The API's own refusal, as the browser hears it: the kind of error and, when the API named one, its code. */
async function upstreamFailure(upstream: Response): Promise<Response> {
  let code: string | undefined;
  try {
    const body: unknown = await upstream.json();
    if (body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string") code = (body as { code: string }).code;
  } catch {
    await upstream.body?.cancel().catch(() => undefined);
  }
  const error = relayErrorFromStatus(upstream.status);
  return relayFailure(error, error === "unavailable" ? 503 : upstream.status, code);
}

function failureFromError(error: unknown): Response {
  const status = error instanceof AdminApiError ? error.status : 503;
  const kind = relayErrorFromStatus(status);
  return relayFailure(kind, kind === "unavailable" ? 503 : status);
}

function requestSurface(request: NextRequest) {
  try {
    // The root path is valid on every area, so only the hostname decides it.
    return resolveHostContext(request.headers.get("host") ?? "", "/", siteDomain()).surface;
  } catch {
    return undefined;
  }
}

export function validLocale(locale: string): boolean {
  return (routing.locales as readonly string[]).includes(locale);
}

/**
 * Cookie-authenticated state changes must come from this same origin. Browsers always send `Origin` on cross-origin
 * and same-origin POST/DELETE fetches, so its absence is refused.
 */
export function sameOrigin(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The panel's session, only on the panel's own host; `allowed` decides from the account's permissions, which the API
 * enforces again on every call.
 */
export async function panelSessionHeaders(request: NextRequest, allowed: (actor: Actor) => boolean = () => true): Promise<Record<string, string> | Response> {
  if (requestSurface(request) !== "panel") return relayFailure("notFound", 404);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return relayFailure("forbidden", 401);
  try {
    const actor = actorSchema.parse(await adminApi("auth/session", token));
    if (!allowed(actor)) return relayFailure("forbidden", 403);
  } catch (error) {
    return failureFromError(error instanceof AdminApiError && error.status === 401 ? new AdminApiError(401) : error);
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * A public image of the API (a media rendition, a brand image), relayed with the API's own immutable caching, so the
 * browser never contacts the API or any third party. Only images pass.
 */
export async function forwardPublicImage(request: NextRequest, path: string): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(path), { cache: "no-store", redirect: "error", signal: timeoutSignal(request, 30_000) });
  } catch {
    return new Response(null, { status: 503 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !/^image\/(webp|png|jpeg)$/.test(type)) {
    await upstream.body?.cancel().catch(() => undefined);
    return new Response(null, { status: upstream.status === 404 ? 404 : 503, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": type, "Cache-Control": upstream.headers.get("cache-control") ?? "public, max-age=3600",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

function timeoutSignal(request: NextRequest, milliseconds: number): AbortSignal {
  return AbortSignal.any([request.signal, AbortSignal.timeout(milliseconds)]);
}

/**
 * Streams one multipart request (a file with its text fields) to the API without buffering it here. Bodies larger
 * than a single allowed file (`maxBytes`) plus framing are refused from `Content-Length` before a byte is read.
 * The API's answer is passed on as JSON.
 */
export async function forwardUpload(request: NextRequest, path: string, headers: Record<string, string>, maxBytes: number, method: "POST" | "PUT" = "POST"): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=[^\s;]{1,200}$/i.test(contentType) || !request.body) return relayFailure("invalidInput", 400);
  const declared = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(declared) || declared <= 0) return relayFailure("invalidInput", 411);
  if (declared > maxBytes + MULTIPART_OVERHEAD_BYTES) return relayFailure("tooLarge", 413, "file_too_large");
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(path), {
      method,
      headers: { ...headers, "Content-Type": contentType, "Content-Length": String(declared) },
      body: request.body,
      // Required by Node's fetch to send a ReadableStream body without buffering it first.
      duplex: "half",
      cache: "no-store", redirect: "error", signal: timeoutSignal(request, UPLOAD_TIMEOUT_MS),
    } as RequestInit & { duplex: "half" });
  } catch (error) {
    return failureFromError(error);
  }
  if (!upstream.ok) return upstreamFailure(upstream);
  try {
    return Response.json(await upstream.json(), { status: upstream.status === 201 ? 201 : 200, headers: PRIVATE_HEADERS });
  } catch {
    return relayFailure("unavailable", 503);
  }
}

/** What the API decided about a file and the relay repeats: its type, size, name, range and what it may run. */
const FILE_HEADERS = ["content-type", "content-length", "content-disposition", "content-range", "accept-ranges", "content-security-policy"] as const;

/**
 * Relays a stored file as is, whole or the byte range the browser asked for (a PDF viewer and a media player ask
 * for ranges). The API alone decides whether it is shown in place or downloaded and under which policy. A visitor
 * abort cancels the upstream request as well.
 */
export async function forwardFile(request: NextRequest, path: string, headers: Record<string, string>): Promise<Response> {
  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(path), {
      headers: range && /^bytes=\d*-\d*$/.test(range) ? { ...headers, Range: range } : headers,
      cache: "no-store", redirect: "error", signal: timeoutSignal(request, DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    return failureFromError(error);
  }
  if (upstream.status === 416) {
    await upstream.body?.cancel().catch(() => undefined);
    return new Response(null, { status: 416, headers: { ...PRIVATE_HEADERS, "Content-Range": upstream.headers.get("content-range") ?? "bytes */0" } });
  }
  if (!upstream.ok) return upstreamFailure(upstream);
  if (!upstream.body || !upstream.headers.get("content-disposition")) {
    await upstream.body?.cancel().catch(() => undefined);
    return relayFailure("unavailable", 503);
  }
  const relayed = new Headers(PRIVATE_HEADERS);
  for (const name of FILE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) relayed.set(name, value);
  }
  // A PDF is drawn in a frame of this same page; nothing else of the panel may frame it.
  relayed.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers: relayed });
}

/**
 * Relays a server-sent event stream (an answer being written) without buffering it. A refusal before the stream
 * opens is passed on as an ordinary JSON error; leaving the page cancels the upstream request, which the API takes
 * as "stop writing".
 */
export async function forwardEventStream(request: NextRequest, path: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(path), {
      method: "POST", headers: { ...headers, "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(body),
      cache: "no-store", redirect: "error", signal: timeoutSignal(request, DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    return failureFromError(error);
  }
  if (!upstream.ok) return upstreamFailure(upstream);
  if (!upstream.body || !upstream.headers.get("content-type")?.startsWith("text/event-stream")) {
    await upstream.body?.cancel().catch(() => undefined);
    return relayFailure("unavailable", 503);
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { ...PRIVATE_HEADERS, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no", Connection: "keep-alive" },
  });
}
