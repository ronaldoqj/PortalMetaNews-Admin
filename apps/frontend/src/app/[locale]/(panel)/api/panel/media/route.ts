import type { NextRequest } from "next/server";
import { hasPermission } from "@/components/admin/permissions";
import { forwardUpload, panelSessionHeaders, relayFailure, sameOrigin, validLocale } from "@/components/shared/file-relay";

/** Mirrors the API's largest image upload (`UPLOAD_MAX_MB`, 15 by default); the API checks again. */
export const MEDIA_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

/** Sends one image to the media library: multipart `file` plus `title`, `alt`, `caption` (JSON) and `credit`. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/api/panel/media">) {
  const { locale } = await params;
  if (!validLocale(locale)) return relayFailure("notFound", 404);
  if (!sameOrigin(request)) return relayFailure("forbidden", 403);
  const headers = await panelSessionHeaders(request, (actor) => hasPermission(actor, "media:manage"));
  if (headers instanceof Response) return headers;
  return forwardUpload(request, "panel/media", headers, MEDIA_UPLOAD_MAX_BYTES);
}
