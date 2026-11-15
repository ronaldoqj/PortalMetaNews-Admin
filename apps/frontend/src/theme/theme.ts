import { darken, defaultVariantColorsResolver, type CSSVariablesResolver, type MantineColorsTuple, type MantineTheme, type MantineThemeOverride } from "@mantine/core";
import { defaultBranding, type Branding, type ColorScheme, type InputStyle, type Palette } from "../tokens/branding";
import { resolveFontFamily } from "../tokens/typography";

function portals(hex: string): number[] {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

/** `amount` of `to` over `from`, as a lowercase hex colour. */
export function mix(from: string, to: string, amount: number): string {
  const target = portals(to);
  return `#${portals(from).map((value, index) => Math.round(value * (1 - amount) + target[index] * amount)
    .toString(16).padStart(2, "0")).join("")}`;
}

/** Ten shades with the exact brand colour at index 6, the filled shade of both schemes. */
export function shades(color: string): MantineColorsTuple {
  return [
    mix(color, "#ffffff", 0.92), mix(color, "#ffffff", 0.84), mix(color, "#ffffff", 0.7), mix(color, "#ffffff", 0.55),
    mix(color, "#ffffff", 0.38), mix(color, "#ffffff", 0.2), color.toLowerCase(),
    mix(color, "#000000", 0.15), mix(color, "#000000", 0.3), mix(color, "#000000", 0.45),
  ];
}

/** Mantine's light neutrals (subtle backgrounds, borders, dimmed text) drawn from the light palette. */
function lightNeutrals(palette: Palette): MantineColorsTuple {
  return [
    mix(palette.surface, palette.highlight, 0.5), palette.highlight, palette.border, mix(palette.border, palette.muted, 0.18),
    mix(palette.border, palette.muted, 0.4), mix(palette.border, palette.muted, 0.7), palette.muted,
    mix(palette.muted, palette.foreground, 0.5), palette.foreground, mix(palette.foreground, "#000000", 0.3),
  ];
}

/** Mantine's dark neutrals: 0-2 text, 3-5 borders, 6 elevated, 7 surface, 8 background. */
function darkNeutrals(palette: Palette): MantineColorsTuple {
  return [
    palette.foreground, mix(palette.foreground, palette.muted, 0.5), palette.muted, mix(palette.muted, palette.border, 0.45),
    palette.border, mix(palette.border, palette.highlight, 0.5), palette.highlight, palette.surface, palette.background,
    mix(palette.background, "#000000", 0.35),
  ];
}

/** Black or white text on a filled colour, by relative luminance. */
export function readableOn(hex: string): string {
  const [red, green, blue] = portals(hex).map((value) => value / 255)
    .map((portal) => portal <= 0.03928 ? portal / 12.92 : ((portal + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.36 ? "#000000" : "#ffffff";
}

/** Filled brand buttons and avatars take the readable text colour of the rendered scheme. */
const brandColors = new Set([undefined, "brand", "accent"]);
const filledText = (props: { variant?: string; color?: string }) => (props.variant ?? "filled") === "filled" && brandColors.has(props.color)
  ? `var(--app-on-${props.color === "accent" ? "secondary" : "primary"})`
  : undefined;

/**
 * The props a form field takes from the identity's `inputStyle`: the platform's own variant (`field-*`, drawn
 * in `globals.css` from the field tokens) and the shape's radius and size, the platform's `sm` by default.
 * Multi-line fields round less, so text never meets a pill-shaped corner. Previews pass all of them, so the
 * identity being rendered never shows through; the theme applies the same values.
 */
export function inputStyleProps({ variant, shape }: InputStyle, multiline = false) {
  return {
    variant: `field-${variant}`,
    radius: shape === "square" ? 0 : shape === "rounded" ? multiline ? "lg" : "xl" : "sm",
    size: shape === "dense" ? "xs" : "sm",
  };
}

const RADIUS: Record<string | number, string> = {
  0: "0px", sm: "var(--mantine-radius-sm)", lg: "var(--mantine-radius-lg)", xl: "var(--mantine-radius-xl)",
};

/**
 * Mantine computes a field's radius and height from the props of the field itself (a `TextInput`, a
 * `Select`), not from the `Input` defaults, so the shape is applied as variables, unless the field sets
 * its own radius or size.
 */
function shapeVars(style: InputStyle, multiline: boolean) {
  return (_theme: unknown, props: { radius?: unknown; size?: unknown; multiline?: boolean }) => {
    if (style.shape === "default") return { wrapper: {} };
    const { radius, size } = inputStyleProps(style, multiline || !!props.multiline);
    const dense = size === "xs" && props.size === undefined;
    return { wrapper: {
      "--input-radius": props.radius === undefined ? RADIUS[radius] : undefined,
      "--input-height": dense ? "var(--input-height-xs)" : undefined,
      "--input-fz": dense ? "var(--mantine-font-size-xs)" : undefined,
      "--input-padding-y": dense && (multiline || props.multiline) ? "var(--input-padding-y-xs)" : undefined,
    } };
  };
}

/**
 * What form fields draw from in one scheme, from the palette: the platform's original field (the surface
 * colour inside Mantine's border), the tint of filled fields and the shadow of standout ones.
 */
export function fieldTokens(palette: Palette, scheme: ColorScheme): Record<string, string> {
  return scheme === "light"
    ? {
      "--app-field-bg": palette.surface, "--app-field-border": mix(palette.border, palette.muted, 0.4), "--app-field-fill": palette.highlight,
      "--app-field-shadow": `${palette.foreground}24`,
    }
    : {
      "--app-field-bg": palette.surface, "--app-field-border": palette.border, "--app-field-fill": palette.highlight,
      "--app-field-shadow": "#00000073",
    };
}

/** How much darker each chip ends than it starts: deep on solid chips, a touch on the pale ones. */
const BADGE_GRADIENT_DEPTH: Record<string, number> = { filled: 0.22, light: 0.08 };

/**
 * Solid and pale chips (`filled`, the default, and `light`) run at 30° from their colour to a darker shade of
 * it, through Mantine's `darken`, which keeps theme variables as variables (a `color-mix` with black): the gradient
 * follows the dark scheme's palette and each client's colours. Outlined, dotted and plain chips stay flat.
 */
function badgeGradient(theme: MantineTheme, props: { variant?: string; color?: string; gradient?: unknown }) {
  const variant = props.variant ?? "filled";
  const depth = BADGE_GRADIENT_DEPTH[variant];
  if (depth === undefined) return { root: {} };
  const { background } = defaultVariantColorsResolver({ color: props.color ?? theme.primaryColor, theme, variant, gradient: undefined });
  return { root: { "--badge-bg": `linear-gradient(30deg, ${background} 0%, ${darken(background, depth)} 100%)` } };
}

/** A discreet shadow under the same chips, in a darker shade of their own colour, mostly transparent. */
function badgeShadow(theme: MantineTheme, props: { variant?: string; color?: string }) {
  const variant = props.variant ?? "filled";
  if (BADGE_GRADIENT_DEPTH[variant] === undefined) return { root: {} };
  const { background } = defaultVariantColorsResolver({ color: props.color ?? theme.primaryColor, theme, variant, gradient: undefined });
  return { root: { boxShadow: `0 1px 2px color-mix(in srgb, ${darken(background, 0.4)}, transparent ${variant === "filled" ? 65 : 80}%)` } };
}

/** The theme's corner radius, as Mantine's scale (`none` is square). */
const RADII: Record<Branding["radius"], string | number> = { none: 0, xs: "xs", sm: "sm", md: "md", lg: "lg", xl: "xl" };

/**
 * `brand` and `accent` carry the light palette; the dark scheme swaps every variable derived from them
 * (see {@link brandingVariablesResolver}), so components keep using a single colour name.
 */
export function createBrandingTheme(branding: Branding) {
  return {
    primaryColor: "brand",
    primaryShade: { light: 6, dark: 6 },
    colors: {
      brand: shades(branding.light.primary),
      accent: shades(branding.light.secondary),
      gray: lightNeutrals(branding.light),
      dark: darkNeutrals(branding.dark),
    },
    components: {
      // Navigation labels that wrap (long submenu names in the 224px sidebar) keep their lines close together.
      // The label is an inline span, so the line height must be set on the block that holds it.
      NavLink: { styles: { body: { lineHeight: 1.2 } } },
      // Every field (inputs, selects, text areas, the rich-text editor) takes the identity's field style.
      Input: { defaultProps: { variant: inputStyleProps(branding.inputStyle).variant }, vars: shapeVars(branding.inputStyle, false) },
      Textarea: { vars: shapeVars(branding.inputStyle, true) },
      Button: { vars: (_theme: unknown, props: { variant?: string; color?: string }) => {
        const color = filledText(props);
        return { root: color ? { "--button-color": color } : {} };
      } },
      ActionIcon: { vars: (_theme: unknown, props: { variant?: string; color?: string }) => {
        const color = filledText(props);
        return { root: color ? { "--ai-color": color } : {} };
      } },
      // A badge is a label inside a line (a page description, a name, a table cell): an inline `span`, never a `div`, so it
      // is valid inside a paragraph and the server's HTML matches the browser's.
      Badge: { defaultProps: { component: "span" }, vars: badgeGradient, styles: badgeShadow },
      // Avatars default to `light`, so only an explicitly filled one takes the readable text colour.
      Avatar: { vars: (_theme: unknown, props: { variant?: string; color?: string }) => {
        const color = props.variant === "filled" ? filledText(props) : undefined;
        return { root: color ? { "--avatar-color": color } : {} };
      } },
    },
    defaultRadius: RADII[branding.radius] ?? "sm",
    // Rendered by Mantine as `--mantine-font-family` and `--mantine-font-family-headings` in the server response,
    // which every text, control and heading (Mantine's and the stylesheets') draws from.
    fontFamily: resolveFontFamily(branding.typography.fontBody),
    headings: {
      fontFamily: resolveFontFamily(branding.typography.fontHeadings),
      fontWeight: "600",
    },
  } satisfies MantineThemeOverride;
}

/** The variables Mantine derives from one colour, rebuilt from the dark palette's shades. */
function darkColorVariables(name: string, color: string): Record<string, string> {
  const tones = shades(color);
  return {
    ...Object.fromEntries(tones.map((tone, index) => [`--mantine-color-${name}-${index}`, tone])),
    [`--mantine-color-${name}-filled`]: tones[6],
    [`--mantine-color-${name}-filled-hover`]: tones[5],
    [`--mantine-color-${name}-light`]: `color-mix(in srgb, ${tones[6]} 15%, transparent)`,
    [`--mantine-color-${name}-light-hover`]: `color-mix(in srgb, ${tones[6]} 22%, transparent)`,
    [`--mantine-color-${name}-light-color`]: tones[3],
    [`--mantine-color-${name}-outline`]: tones[6],
    [`--mantine-color-${name}-outline-hover`]: `color-mix(in srgb, ${tones[6]} 8%, transparent)`,
    [`--mantine-color-${name}-text`]: tones[6],
  };
}

/** Body and text follow the surface tokens; the brand colours follow the dark palette in the dark scheme. */
export function brandingVariablesResolver(branding: Branding): CSSVariablesResolver {
  const surface = { "--mantine-color-body": "var(--app-background)", "--mantine-color-text": "var(--app-ink)" };
  return () => ({
    variables: {},
    light: surface,
    dark: {
      ...surface,
      ...darkColorVariables("brand", branding.dark.primary),
      ...darkColorVariables("accent", branding.dark.secondary),
      "--mantine-primary-color-contrast": readableOn(branding.dark.primary),
    },
  });
}

const VARIABLES = {
  primary: "--app-primary",
  secondary: "--app-secondary",
  background: "--app-background",
  surface: "--app-surface",
  highlight: "--app-highlight",
  border: "--app-border",
  foreground: "--app-ink",
  muted: "--app-muted",
} as const satisfies Record<keyof Palette, string>;

/** The radius as a CSS length, for stylesheets that draw their own corners (the site's cards and images). */
const RADIUS_CSS: Record<Branding["radius"], string> = { none: "0px", xs: "2px", sm: "4px", md: "8px", lg: "16px", xl: "32px" };

function declarations(palette: Palette, scheme: ColorScheme): string {
  return (Object.keys(VARIABLES) as Array<keyof Palette>)
    .map((field) => `${VARIABLES[field]}:${palette[field]};`).join("")
    + `--app-on-primary:${readableOn(palette.primary)};--app-on-secondary:${readableOn(palette.secondary)};`
    + Object.entries(fieldTokens(palette, scheme)).map(([name, value]) => `${name}:${value};`).join("");
}

/**
 * The surface tokens of both schemes, rendered on the server into the first response so there is no
 * flash of another identity. Values come only from validated `#rrggbb` palettes, so the stylesheet
 * cannot carry markup or other declarations. `--app-primary-on-light` keeps the light palette's primary in both
 * schemes, for brand text on an element that stays light in the dark one too (a white button over a photo).
 */
export function brandingStylesheet(branding: Branding): string {
  return `:root{${declarations(branding.light, "light")}--app-primary-on-light:${branding.light.primary};--app-radius:${RADIUS_CSS[branding.radius]};color-scheme:light;}`
    + `:root[data-mantine-color-scheme="dark"]{${declarations(branding.dark, "dark")}color-scheme:dark;}`;
}

export const theme = createBrandingTheme(defaultBranding);
