import { z } from "zod";
import { i18nStringSchema } from "../../i18n/i18n-string";
import { brandingAssetsSchema, brandingSchema } from "../../tokens/branding";
import { SOCIAL_NETWORKS } from "../../theme/site-settings";

/** Where a theme is used: the news site or the panel. Mirrors the API's `THEME_SURFACES`. */
export const THEME_SURFACES = ["site", "panel"] as const;
export const themeSurfaceSchema = z.enum(THEME_SURFACES);
export type ThemeSurface = z.infer<typeof themeSurfaceSchema>;

/** One theme as `panel/themes` answers it (`ThemesService.view`). */
export const themeSchema = z.object({
  id: z.uuid(), slug: z.string().nullable(), name: z.string().min(1).max(80), description: z.string().max(300),
  tokens: brandingSchema, system: z.boolean(), activeOn: z.array(themeSurfaceSchema),
  updatedAt: z.iso.datetime({ offset: true }), updatedBy: z.string().nullable(),
}).strict();
export type Theme = z.infer<typeof themeSchema>;

export const themeListSchema = z.object({
  items: z.array(themeSchema), active: z.object({ site: z.uuid(), panel: z.uuid() }).strict(),
}).strict();
export type ThemeList = z.infer<typeof themeListSchema>;

/** What the editor saves: the name, the description and the complete tokens. */
export const themeInputSchema = z.object({
  name: z.string().trim().min(1).max(80), description: z.string().trim().max(300), tokens: brandingSchema,
}).strict();
export type ThemeInput = z.infer<typeof themeInputSchema>;

export const duplicateInputSchema = z.object({ name: z.string().trim().min(1).max(80), from: z.uuid() }).strict();

/** The portal's identity as `panel/site` answers it (`SiteSettingsService.identity`). */
export const siteIdentitySchema = z.object({
  siteName: z.string().min(1).max(80),
  tagline: i18nStringSchema({ maxLength: 160, required: false }),
  description: i18nStringSchema({ maxLength: 300, required: false }),
  defaultLocale: z.enum(["pt", "en"]),
  contactEmail: z.string().nullable(),
  social: z.partialRecord(z.enum(SOCIAL_NETWORKS), z.string()),
  assets: brandingAssetsSchema,
}).strict();
export type SiteIdentity = z.infer<typeof siteIdentitySchema>;

const socialUrl = z.union([z.literal(""), z.string().trim().max(300).regex(/^https:\/\/[^\s"<>]+$/)]);

/** The site details form: flat values, one field per social network. */
export const siteDetailsSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  tagline: i18nStringSchema({ maxLength: 160, required: false }),
  description: i18nStringSchema({ maxLength: 300, required: false }),
  defaultLocale: z.enum(["pt", "en"]),
  contactEmail: z.union([z.literal(""), z.email().max(254)]),
  ...Object.fromEntries(SOCIAL_NETWORKS.map((network) => [`social_${network}`, socialUrl])) as Record<`social_${(typeof SOCIAL_NETWORKS)[number]}`, typeof socialUrl>,
});
export type SiteDetails = z.infer<typeof siteDetailsSchema>;

export function siteDetailsOf(identity: SiteIdentity): SiteDetails {
  return {
    siteName: identity.siteName, tagline: { pt: identity.tagline.pt ?? "", en: identity.tagline.en ?? "" },
    description: { pt: identity.description.pt ?? "", en: identity.description.en ?? "" }, defaultLocale: identity.defaultLocale,
    contactEmail: identity.contactEmail ?? "",
    ...Object.fromEntries(SOCIAL_NETWORKS.map((network) => [`social_${network}`, identity.social[network] ?? ""])),
  } as SiteDetails;
}

/** The body `PUT panel/site` takes. */
export function identityInputOf(details: SiteDetails) {
  return {
    siteName: details.siteName, tagline: details.tagline, description: details.description, defaultLocale: details.defaultLocale,
    contactEmail: details.contactEmail || null,
    social: Object.fromEntries(SOCIAL_NETWORKS.map((network) => [network, details[`social_${network}`] || null])),
  };
}
