import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CARD_STYLES, FONT_OPTIONS, HEADER_LAYOUTS, INPUT_SHAPES, INPUT_VARIANTS, PALETTE_FIELDS, RADIUS_OPTIONS, parseThemeTokens } from './theme-tokens.js';

const palette = (color: string) => Object.fromEntries(PALETTE_FIELDS.map((field) => [field, color]));
const valid = {
  light: palette('#0f3d91'), dark: palette('#7EA6FF'), inputStyle: { variant: 'default', shape: 'default' },
  typography: { fontHeadings: 'newsreader', fontBody: 'inter' }, radius: 'sm', site: { header: 'left', cards: 'flat' },
};

describe('theme tokens', () => {
  it('accepts a complete theme and uppercases its colours', () => {
    expect(parseThemeTokens(valid)?.light.primary).toBe('#0F3D91');
  });

  it.each([
    ['a missing palette', { ...valid, dark: undefined }],
    ['an unknown key', { ...valid, extra: 1 }],
    ['a colour that is not hex', { ...valid, light: { ...valid.light, primary: 'red' } }],
    ['an unknown font', { ...valid, typography: { fontHeadings: 'comic-sans', fontBody: 'inter' } }],
    ['an unknown radius', { ...valid, radius: 'huge' }],
    ['an unknown header', { ...valid, site: { header: 'right', cards: 'flat' } }],
  ])('refuses %s', (_case, tokens) => {
    expect(parseThemeTokens(tokens)).toBeNull();
  });

  it('keeps the frontend lists identical', () => {
    const frontend = readFileSync(fileURLToPath(new URL('../../../../frontend/src/tokens/branding.ts', import.meta.url)), 'utf8')
      + readFileSync(fileURLToPath(new URL('../../../../frontend/src/tokens/typography.ts', import.meta.url)), 'utf8');
    const list = (values: readonly string[]) => `[${values.map((value) => `"${value}"`).join(', ')}]`;
    for (const [name, values] of Object.entries({ PALETTE_FIELDS, INPUT_VARIANTS, INPUT_SHAPES, RADIUS_OPTIONS, HEADER_LAYOUTS, CARD_STYLES })) {
      expect(frontend).toContain(`export const ${name} = ${list(values)} as const;`);
    }
    expect(frontend.replace(/\s+/g, ' ')).toContain(`export const FONT_OPTIONS = ${list(FONT_OPTIONS)} as const;`.replace(/\s+/g, ' '));
  });
});
