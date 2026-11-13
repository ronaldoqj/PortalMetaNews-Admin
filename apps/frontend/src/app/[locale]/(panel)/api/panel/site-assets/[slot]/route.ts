import type { NextRequest } from "next/server";
import { hasPermission } from "@/components/admin/permissions";
import { forwardUpload, panelSessionHeaders, relayFailure, sameOrigin, validLocale } from "@/components/shared/file-relay";
import { BRANDING_ASSET_SLOTS } from "@/tokens/branding";

const BRAND_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Replaces one brand image (logo, favicon, share image): `themes:manage`, as the API requires again. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/api/panel/site-assets/[slot]">) {
  const { locale, slot } = await params;
  if (!validLocale(locale) || !(BRANDING_ASSET_SLOTS as readonly string[]).includes(slot)) return relayFailure("notFound", 404);
  if (!sameOrigin(request)) return relayFailure("forbidden", 403);
  const headers = await panelSessionHeaders(request, (actor) => hasPermission(actor, "themes:manage"));
  if (headers instanceof Response) return headers;
  return forwardUpload(request, `panel/site/assets/${slot}`, headers, BRAND_IMAGE_MAX_BYTES);
}
