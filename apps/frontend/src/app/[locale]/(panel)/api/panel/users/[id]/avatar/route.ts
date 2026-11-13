import type { NextRequest } from "next/server";
import { z } from "zod";
import { AVATAR_UPLOAD_MAX_BYTES } from "@/components/admin/avatar-image";
import { forwardAvatar } from "@/components/admin/avatar-routes";
import { hasPermission } from "@/components/admin/permissions";
import { forwardUpload, panelSessionHeaders, relayFailure, sameOrigin, validLocale } from "@/components/shared/file-relay";

/** A colleague's photo, for any account of the panel. */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/api/panel/users/[id]/avatar">) {
  const { locale, id } = await params;
  if (!validLocale(locale) || !z.uuid().safeParse(id).success) return relayFailure("notFound", 404);
  const headers = await panelSessionHeaders(request);
  if (headers instanceof Response) return headers;
  return forwardAvatar(request, `panel/team/users/${id}/avatar`, headers);
}

/** Replaces an account's photo: `users:manage`, as the API requires again. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/api/panel/users/[id]/avatar">) {
  const { locale, id } = await params;
  if (!validLocale(locale) || !z.uuid().safeParse(id).success) return relayFailure("notFound", 404);
  if (!sameOrigin(request)) return relayFailure("forbidden", 403);
  const headers = await panelSessionHeaders(request, (actor) => hasPermission(actor, "users:manage"));
  if (headers instanceof Response) return headers;
  return forwardUpload(request, `panel/team/users/${id}/avatar`, headers, AVATAR_UPLOAD_MAX_BYTES, "PUT");
}
