import { z } from "zod";
import { typographySchema } from "./typography";

/**
 * The design tokens of a theme; mirrors the API's `modules/site/theme-tokens.ts` (contract-tested). The panel's theme
 * manager edits them; the site and the panel each render the theme active for them, as CSS variables during SSR.
 * Components read the variables (`var(--app-primary)`) and never hold a fixed colour or name a typeface.
 */
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/);

export const PALETTE_FIELDS = ["primary", "secondary", "background", "surface", "highlight", "border", "foreground", "muted"] as const;
export type PaletteField = (typeof PALETTE_FIELDS)[number];
export const paletteSchema = z.object({
  primary: color, secondary: color, background: color, surface: color,
  /** Highlighted areas in the light scheme, elevated surfaces in the dark one. */
  highlight: color, border: color, foreground: color, muted: color,
}).strict();
export type Palette = z.infer<typeof paletteSchema>;

export const COLOR_SCHEMES = ["light", "dark"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

/**
 * How form fields are drawn: `default` the bordered field, `filled` a tinted field without border, `outlined` a
 * heavier border, `borderless` an underline only and `standout` an elevated field with a soft shadow.
 */
export const INPUT_VARIANTS = ["default", "filled", "outlined", "borderless", "standout"] as const;
export type InputVariant = (typeof INPUT_VARIANTS)[number];
/** Corners and density of fields: `default` keeps the small radius and regular height. */
export const INPUT_SHAPES = ["default", "square", "rounded", "dense"] as const;
export type InputShape = (typeof INPUT_SHAPES)[number];
export const inputStyleSchema = z.object({ variant: z.enum(INPUT_VARIANTS), shape: z.enum(INPUT_SHAPES) }).strict();
export type InputStyle = z.infer<typeof inputStyleSchema>;

/** The corner radius of cards, buttons and images. */
export const RADIUS_OPTIONS = ["none", "xs", "sm", "md", "lg", "xl"] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];
/** The site's header: the logo on the left with the menu beside it, or a centred masthead above the menu. */
export const HEADER_LAYOUTS = ["left", "centered"] as const;
/** How the site's news cards stand out: flat on the page, outlined or elevated with a shadow. */
export const CARD_STYLES = ["flat", "outlined", "elevated"] as const;
export const siteLayoutSchema = z.object({ header: z.enum(HEADER_LAYOUTS), cards: z.enum(CARD_STYLES) }).strict();
export type SiteLayout = z.infer<typeof siteLayoutSchema>;

/** A complete theme: both palettes, fields, typography, corners and the site's layout choices. */
export const brandingSchema = z.object({
  light: paletteSchema, dark: paletteSchema, inputStyle: inputStyleSchema, typography: typographySchema,
  radius: z.enum(RADIUS_OPTIONS), site: siteLayoutSchema,
}).strict();
export type Branding = z.infer<typeof brandingSchema>;
export type ThemeTokens = Branding;

/**
 * The Meta News theme bundled with the frontend. It renders only while the API cannot provide the active themes
 * (for example while it is being upgraded), so a page never renders unstyled.
 */
export const defaultBranding: Branding = {
  light: {
    primary: "#0F3D91", secondary: "#E63946", background: "#F7F8FA", surface: "#FFFFFF",
    highlight: "#EEF2F8", border: "#DDE3EC", foreground: "#0B1324", muted: "#5B6577",
  },
  dark: {
    primary: "#7EA6FF", secondary: "#FF6B76", background: "#0A0F1A", surface: "#111827",
    highlight: "#1A2333", border: "#273246", foreground: "#F2F5FA", muted: "#9AA6B8",
  },
  inputStyle: { variant: "default", shape: "default" },
  typography: { fontHeadings: "newsreader", fontBody: "inter" },
  radius: "sm",
  site: { header: "left", cards: "flat" },
};

/** The bundled panel theme: the same colours set in the interface typeface. */
export const defaultPanelBranding: Branding = { ...defaultBranding, typography: { fontHeadings: "manrope", fontBody: "manrope" }, radius: "md", site: { header: "left", cards: "outlined" } };

/** Mirrors the API: each upload gets a new random name, in the single format of its slot. */
export const BRANDING_ASSET_SLOTS = ["logo", "logoDark", "favicon", "faviconDark", "social"] as const;
export type BrandingAssetSlot = (typeof BRANDING_ASSET_SLOTS)[number];
export const BRANDING_ASSET_FILE = /^(?:(?:logo|logodark)-[0-9a-f]{32}\.webp|favicon(?:dark)?-[0-9a-f]{32}\.png|social-[0-9a-f]{32}\.jpg)$/;
const assetFile = z.string().regex(BRANDING_ASSET_FILE).nullable();
export const brandingAssetsSchema = z.object({
  logo: assetFile, logoDark: assetFile, favicon: assetFile, faviconDark: assetFile, social: assetFile,
}).strict();
export type BrandingAssets = z.infer<typeof brandingAssetsSchema>;

/** Same-origin URLs of the images a page renders; a missing slot falls back to the bundled identity. */
export type BrandingAssetUrls = Record<BrandingAssetSlot, string>;

/** The bundled identity (`scripts/brand-assets.mjs`): the same in every language. */
export const bundledAssets: BrandingAssetUrls = {
  logo: "/brand/logo-light.png", logoDark: "/brand/logo-dark.png", favicon: "/brand/favicon.png", faviconDark: "/brand/favicon-dark.png",
  social: "/brand/social.jpg",
};

/**
 * The images a page renders: the portal's own (served by the frontend's relay, so a page never contacts a third
 * party), else the bundled ones. Logos and favicons are pairs: one uploaded image of a pair serves both schemes.
 */
export function brandingAssetUrls(assets: BrandingAssets): BrandingAssetUrls {
  const own = (slot: BrandingAssetSlot) => (assets[slot] ? `/brand-assets/${assets[slot]}` : undefined);
  const pair = (light: BrandingAssetSlot, dark: BrandingAssetSlot) => {
    const first = own(light);
    const second = own(dark);
    return first || second ? [first ?? second!, second ?? first!] : [bundledAssets[light], bundledAssets[dark]];
  };
  const [logo, logoDark] = pair("logo", "logoDark");
  const [favicon, faviconDark] = pair("favicon", "faviconDark");
  return { logo, logoDark, favicon, faviconDark, social: own("social") ?? bundledAssets.social };
}
