import type { NextRequest } from "next/server";
import { forwardPublicImage } from "@/components/shared/file-relay";
import { BRANDING_ASSET_FILE } from "@/tokens/branding";

/** A brand image uploaded in the panel (logo, favicon, share image), under its immutable random name. */
export async function GET(request: NextRequest, { params }: RouteContext<"/brand-assets/[file]">) {
  const { file } = await params;
  if (!BRANDING_ASSET_FILE.test(file)) return new Response(null, { status: 404 });
  return forwardPublicImage(request, `public/branding/assets/${file}`);
}
