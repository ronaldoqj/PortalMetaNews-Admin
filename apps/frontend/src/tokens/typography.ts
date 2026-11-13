import { z } from "zod";

/**
 * The typefaces a theme may choose; mirrors the API. Each one but `system-ui` is a file bundled in `app/fonts` and
 * exposed as `--font-<key>`; `system-ui` is the reader's own operating-system font.
 */
export const FONT_OPTIONS = ["manrope", "inter", "plus-jakarta-sans", "satoshi", "general-sans", "roboto", "poppins", "nunito", "public-sans", "newsreader", "system-ui"] as const;
export type FontOption = (typeof FONT_OPTIONS)[number];

/** The typeface any missing or unknown choice falls back to. */
export const DEFAULT_FONT: FontOption = "manrope";

/** The typeface of headings and that of body text and interface controls, chosen independently. */
export const typographySchema = z.object({ fontHeadings: z.enum(FONT_OPTIONS), fontBody: z.enum(FONT_OPTIONS) }).strict();
export type Typography = z.infer<typeof typographySchema>;

const SYSTEM_STACK = "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";

/** The CSS `font-family` of each option: its bundled file first, the generic family while it loads (serif for Newsreader). */
export const FONT_FAMILIES = {
  manrope: "var(--font-manrope), sans-serif",
  inter: "var(--font-inter), sans-serif",
  "plus-jakarta-sans": "var(--font-plus-jakarta-sans), sans-serif",
  satoshi: "var(--font-satoshi), sans-serif",
  "general-sans": "var(--font-general-sans), sans-serif",
  roboto: "var(--font-roboto), sans-serif",
  poppins: "var(--font-poppins), sans-serif",
  nunito: "var(--font-nunito), sans-serif",
  "public-sans": "var(--font-public-sans), sans-serif",
  newsreader: "var(--font-newsreader), serif",
  "system-ui": SYSTEM_STACK,
} as const satisfies Record<FontOption, string>;

export function isFontOption(value: unknown): value is FontOption {
  return typeof value === "string" && (FONT_OPTIONS as readonly string[]).includes(value);
}

/** The `font-family` of a stored choice; anything missing or unknown renders in Manrope. */
export function resolveFontFamily(fontKey: unknown): string {
  return FONT_FAMILIES[isFontOption(fontKey) ? fontKey : DEFAULT_FONT];
}
