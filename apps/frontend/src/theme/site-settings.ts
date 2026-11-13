import { z } from "zod";
import { i18nStringSchema } from "../i18n/i18n-string";
import { brandingAssetsSchema, brandingSchema } from "../tokens/branding";

/** A section of the site's menu, as `public/site` lists it. */
export const menuCategorySchema = z.object({
  id: z.uuid(), name: i18nStringSchema({ maxLength: 80, required: true }), slug: z.object({ pt: z.string(), en: z.string() }),
  description: i18nStringSchema({ maxLength: 300, required: false }), color: z.string(), position: z.number(), active: z.boolean(), showInMenu: z.boolean(),
});
export type MenuCategory = z.infer<typeof menuCategorySchema>;

export const SOCIAL_NETWORKS = ["instagram", "facebook", "x", "youtube", "tiktok", "linkedin", "whatsapp", "telegram"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** What every page renders, from `public/site`: the portal's identity, both active themes and the menu. */
export const publicSiteSchema = z.object({
  siteName: z.string().min(1).max(80),
  tagline: i18nStringSchema({ maxLength: 160, required: false }),
  description: i18nStringSchema({ maxLength: 300, required: false }),
  defaultLocale: z.enum(["pt", "en"]),
  social: z.partialRecord(z.enum(SOCIAL_NETWORKS), z.string()),
  assets: brandingAssetsSchema,
  themes: z.object({ site: brandingSchema, panel: brandingSchema }),
  updatedAt: z.string(),
  categories: z.array(menuCategorySchema),
});
export type PublicSite = z.infer<typeof publicSiteSchema>;
