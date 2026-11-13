import type { NextRequest } from "next/server";
import { z } from "zod";
import { backendUrl } from "@/components/admin/backend-url";
import { sameOrigin, validLocale } from "@/components/shared/file-relay";

/**
 * One read of an article, relayed to the API from the site's own pages only (same origin). Nothing of the request is
 * forwarded: no address, browser, cookie or referrer reaches the API, which keeps a count per day.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/api/view/[id]">) {
  const { locale, id } = await params;
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!validLocale(locale) || !z.uuid().safeParse(id).success) return new Response(null, { status: 404, headers });
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
  try {
    const upstream = await fetch(backendUrl(`public/news/${id}/view`), { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
    return new Response(null, { status: upstream.status === 404 ? 404 : 204, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
