import type { NextRequest } from "next/server";
import { AVATAR_UPLOAD_MAX_BYTES } from "@/components/admin/avatar-image";
import { forwardUpload, panelSessionHeaders, relayFailure, sameOrigin, validLocale } from "@/components/shared/file-relay";

/** Replaces the signed-in account's own photo. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/api/panel/profile/avatar">) {
  const { locale } = await params;
  if (!validLocale(locale)) return relayFailure("notFound", 404);
  if (!sameOrigin(request)) return relayFailure("forbidden", 403);
  const headers = await panelSessionHeaders(request);
  if (headers instanceof Response) return headers;
  return forwardUpload(request, "panel/profile/avatar", headers, AVATAR_UPLOAD_MAX_BYTES, "PUT");
}
