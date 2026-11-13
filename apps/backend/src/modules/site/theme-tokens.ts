/**
 * The design tokens of a theme, validated here and mirrored by the frontend's `tokens/branding.ts` (a contract test
 * keeps the lists identical). The site and the panel each render one theme, chosen in the panel; components read the
 * tokens as CSS variables and never hold a fixed colour or name a typeface.
 */
export const PALETTE_FIELDS = ['primary', 'secondary', 'background', 'surface', 'highlight', 'border', 'foreground', 'muted'] as const;
export const INPUT_VARIANTS = ['default', 'filled', 'outlined', 'borderless', 'standout'] as const;
export const INPUT_SHAPES = ['default', 'square', 'rounded', 'dense'] as const;
export const FONT_OPTIONS = [
  'manrope', 'inter', 'plus-jakarta-sans', 'satoshi', 'general-sans', 'roboto', 'poppins', 'nunito', 'public-sans', 'newsreader', 'system-ui',
] as const;
export const RADIUS_OPTIONS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
export const HEADER_LAYOUTS = ['left', 'centered'] as const;
export const CARD_STYLES = ['flat', 'outlined', 'elevated'] as const;

type Palette = Record<(typeof PALETTE_FIELDS)[number], string>;
export interface ThemeTokens {
  light: Palette;
  dark: Palette;
  inputStyle: { variant: (typeof INPUT_VARIANTS)[number]; shape: (typeof INPUT_SHAPES)[number] };
  typography: { fontHeadings: (typeof FONT_OPTIONS)[number]; fontBody: (typeof FONT_OPTIONS)[number] };
  radius: (typeof RADIUS_OPTIONS)[number];
  site: { header: (typeof HEADER_LAYOUTS)[number]; cards: (typeof CARD_STYLES)[number] };
}

const COLOR = /^#[0-9a-fA-F]{6}$/;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const oneOf = <T extends string>(options: readonly T[], value: unknown): value is T => typeof value === 'string' && (options as readonly string[]).includes(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every((key) => key in value);

function palette(value: unknown): Palette | null {
  if (!isObject(value) || !exactKeys(value, PALETTE_FIELDS) || !PALETTE_FIELDS.every((field) => typeof value[field] === 'string' && COLOR.test(value[field] as string))) return null;
  return Object.fromEntries(PALETTE_FIELDS.map((field) => [field, (value[field] as string).toUpperCase()])) as Palette;
}

/** The tokens of a theme in canonical form, or `null` when anything is missing, unknown or out of range. */
export function parseThemeTokens(value: unknown): ThemeTokens | null {
  if (!isObject(value) || !exactKeys(value, ['light', 'dark', 'inputStyle', 'typography', 'radius', 'site'])) return null;
  const light = palette(value.light);
  const dark = palette(value.dark);
  const { inputStyle, typography, site } = value;
  if (!light || !dark || !isObject(inputStyle) || !isObject(typography) || !isObject(site)) return null;
  if (!exactKeys(inputStyle, ['variant', 'shape']) || !oneOf(INPUT_VARIANTS, inputStyle.variant) || !oneOf(INPUT_SHAPES, inputStyle.shape)) return null;
  if (!exactKeys(typography, ['fontHeadings', 'fontBody']) || !oneOf(FONT_OPTIONS, typography.fontHeadings) || !oneOf(FONT_OPTIONS, typography.fontBody)) return null;
  if (!exactKeys(site, ['header', 'cards']) || !oneOf(HEADER_LAYOUTS, site.header) || !oneOf(CARD_STYLES, site.cards)) return null;
  if (!oneOf(RADIUS_OPTIONS, value.radius)) return null;
  return {
    light, dark, inputStyle: { variant: inputStyle.variant, shape: inputStyle.shape },
    typography: { fontHeadings: typography.fontHeadings, fontBody: typography.fontBody }, radius: value.radius,
    site: { header: site.header, cards: site.cards },
  };
}
