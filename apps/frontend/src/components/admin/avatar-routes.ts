import "server-only";

import type { NextRequest } from "next/server";
import { backendUrl } from "./server";
import { relayFailure } from "../shared/file-relay";

/** Stored photos are 256x256 WebP files of a few kilobytes; anything larger is not one of them. */
const AVATAR_RESPONSE_MAX_BYTES = 256 * 1024;

/**
 * Relays a stored photo from the API. Personal data: cached by the browser only, keyed by the photo
 * version in the URL, and never interpreted as anything but a WebP image.
 */
export async function forwardAvatar(request: NextRequest, path: string, headers: Record<string, string>): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(path), {
      headers, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
    });
  } catch {
    return relayFailure("unavailable", 503);
  }
  if (!upstream.ok || upstream.headers.get("content-type") !== "image/webp") {
    await upstream.body?.cancel();
    return relayFailure(upstream.status === 404 ? "notFound" : "unavailable", upstream.status === 404 ? 404 : 503);
  }
  const image = await upstream.arrayBuffer();
  if (image.byteLength > AVATAR_RESPONSE_MAX_BYTES) return relayFailure("unavailable", 503);
  return new Response(image, {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
