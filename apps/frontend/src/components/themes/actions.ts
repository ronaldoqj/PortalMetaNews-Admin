"use server";

import { z } from "zod";
import { panelApi } from "../admin/api-call";
import { INVALID_INPUT, type ApiResult } from "../admin/api-result";
import { actOnResource, removeResource, saveResource } from "../admin/resource";
import { BRANDING_ASSET_SLOTS, type BrandingAssetSlot } from "../../tokens/branding";
import {
  duplicateInputSchema, identityInputOf, siteDetailsSchema, siteIdentitySchema, themeInputSchema, themeListSchema, themeSchema, themeSurfaceSchema,
  type SiteIdentity, type Theme, type ThemeList,
} from "./contracts";

const THEMES = "panel/themes";

/** Saves a theme's name, description and tokens; the API validates the tokens again. */
export async function updateTheme(id: string, input: unknown): Promise<ApiResult<Theme>> {
  return saveResource(THEMES, id, input, themeInputSchema, { permission: "themes:manage", schema: themeSchema });
}

/** A new theme from complete tokens (an import). */
export async function createTheme(input: unknown): Promise<ApiResult<Theme>> {
  return saveResource(THEMES, null, input, themeInputSchema, { permission: "themes:manage", schema: themeSchema });
}

/** A copy of another theme's tokens under a new name. */
export async function duplicateTheme(input: unknown): Promise<ApiResult<Theme>> {
  return saveResource(THEMES, null, input, duplicateInputSchema, { permission: "themes:manage", schema: themeSchema });
}

export async function deleteTheme(id: string): Promise<ApiResult> {
  return removeResource(THEMES, id, "themes:manage");
}

/** Makes a theme the one the site or the panel renders. */
export async function activateTheme(id: string, surface: unknown): Promise<ApiResult<ThemeList>> {
  const parsed = themeSurfaceSchema.safeParse(surface);
  if (!parsed.success) return INVALID_INPUT;
  return actOnResource(THEMES, id, "activate", { body: { surface: parsed.data }, permission: "themes:manage", schema: themeListSchema });
}

/** Saves the portal's name, tagline, description, language, contact and social profiles. */
export async function saveSiteDetails(input: unknown): Promise<ApiResult<SiteIdentity>> {
  const parsed = siteDetailsSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi("panel/site", { method: "PUT", body: identityInputOf(parsed.data), permission: "site:manage", schema: siteIdentitySchema, revalidate: true });
}

/** Removes one brand image; the site then renders the bundled one. Uploads go through the relay instead. */
export async function removeBrandImage(slot: unknown): Promise<ApiResult<SiteIdentity>> {
  const parsed = z.enum(BRANDING_ASSET_SLOTS).safeParse(slot);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi(`panel/site/assets/${parsed.data satisfies BrandingAssetSlot}`, { method: "DELETE", permission: "themes:manage", schema: siteIdentitySchema, revalidate: true });
}
