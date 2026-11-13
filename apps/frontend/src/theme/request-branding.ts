import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { backendUrl } from "../components/admin/backend-url";
import { siteDomain } from "../config/site-hosts";
import { brandingAssetUrls, defaultBranding, defaultPanelBranding, type Branding, type BrandingAssetUrls, bundledAssets } from "../tokens/branding";
import { resolveHostContext, type Surface } from "./host-context";
import { publicSiteSchema, type PublicSite } from "./site-settings";

export type RequestBranding = {
  surface: Surface;
  /** The theme this area renders: the site's or the panel's, as activated in the theme manager. */
  branding: Branding;
  /** Resolved, same-origin image URLs: the portal's own, else the bundled identity. */
  assets: BrandingAssetUrls;
  /** The identity and menu; null while the API cannot be reached (the page still renders with the bundled theme). */
  site: PublicSite | null;
};

/** The portal's identity and active themes, read once per request. */
export const getPublicSite = cache(async (): Promise<PublicSite | null> => {
  try {
    const response = await fetch(backendUrl("public/site"), { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
    const parsed = response.ok ? publicSiteSchema.safeParse(await response.json()) : null;
    return parsed?.success ? parsed.data : null;
  } catch {
    return null;
  }
});

/** The area of the request, from the proxy's trusted headers; the site when there is none (a not-found page). */
export async function requestSurface(): Promise<Surface> {
  const requestHeaders = await headers();
  try {
    return resolveHostContext(requestHeaders.get("x-pmn-host") ?? "", requestHeaders.get("x-pmn-path") ?? "", siteDomain()).surface;
  } catch {
    return "site";
  }
}

export const getRequestBranding = cache(async (): Promise<RequestBranding> => {
  const [surface, site] = await Promise.all([requestSurface(), getPublicSite()]);
  if (!site) return { surface, branding: surface === "panel" ? defaultPanelBranding : defaultBranding, assets: bundledAssets, site: null };
  return { surface, branding: site.themes[surface], assets: brandingAssetUrls(site.assets), site };
});
