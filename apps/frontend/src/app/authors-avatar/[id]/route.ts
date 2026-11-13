import type { NextRequest } from "next/server";
import { z } from "zod";
import { forwardPublicImage } from "@/components/shared/file-relay";

/** The photo of an author of published news, for the site's bylines; the API serves no one else's. */
export async function GET(request: NextRequest, { params }: RouteContext<"/authors-avatar/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  return forwardPublicImage(request, `public/authors/${id}/avatar`);
}
