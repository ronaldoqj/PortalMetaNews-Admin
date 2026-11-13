import type { CSSProperties } from "react";
import { fieldTokens, readableOn } from "../../theme/theme";
import type { Branding, ColorScheme, Palette, RadiusOption } from "../../tokens/branding";
import { resolveFontFamily } from "../../tokens/typography";

/** The corner radius of a theme as a CSS length, as the site's stylesheet draws it. */
export const RADIUS_LENGTHS: Record<RadiusOption, string> = { none: "0px", xs: "2px", sm: "4px", md: "8px", lg: "16px", xl: "32px" };

function channel(value: number): number {
  const portion = value / 255;
  return portion <= 0.03928 ? portion / 12.92 : ((portion + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((index) => channel(parseInt(hex.slice(index, index + 2), 16)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The variables a scheme of a theme sets, scoped to a preview element instead of the page's root: the same names the
 * site and the panel read (`--app-*`, the field tokens and Mantine's font variables), so whatever is drawn inside the
 * preview (real Mantine fields included) shows the theme being edited, not the one rendering the panel.
 */
export function previewVariables(tokens: Branding, scheme: ColorScheme): CSSProperties {
  const palette: Palette = tokens[scheme];
  return {
    "--app-primary": palette.primary, "--app-secondary": palette.secondary, "--app-background": palette.background, "--app-surface": palette.surface,
    "--app-highlight": palette.highlight, "--app-border": palette.border, "--app-ink": palette.foreground, "--app-muted": palette.muted,
    "--app-on-primary": readableOn(palette.primary), "--app-on-secondary": readableOn(palette.secondary),
    "--app-radius": RADIUS_LENGTHS[tokens.radius], "--app-radius-card": RADIUS_LENGTHS[tokens.radius],
    ...fieldTokens(palette, scheme),
    "--mantine-color-text": palette.foreground, "--mantine-color-body": palette.background,
    "--mantine-font-family": resolveFontFamily(tokens.typography.fontBody),
    "--mantine-font-family-headings": resolveFontFamily(tokens.typography.fontHeadings),
    fontFamily: "var(--mantine-font-family)", colorScheme: scheme, background: palette.background, color: palette.foreground,
  } as CSSProperties;
}
