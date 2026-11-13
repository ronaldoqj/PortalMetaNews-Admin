import type { NextRequest } from "next/server";
import { z } from "zod";
import { forwardPublicImage } from "@/components/shared/file-relay";

const VARIANTS = ["sm", "md", "lg", "og"] as const;

/** A rendition of a media library image (`sm`, `md`, `lg` WebP or the `og` JPEG), immutable and public. */
export async function GET(request: NextRequest, { params }: RouteContext<"/media/[id]/[variant]">) {
  const { id, variant } = await params;
  if (!z.uuid().safeParse(id).success || !(VARIANTS as readonly string[]).includes(variant)) return new Response(null, { status: 404 });
  return forwardPublicImage(request, `public/media/${id}/${variant}`);
}
