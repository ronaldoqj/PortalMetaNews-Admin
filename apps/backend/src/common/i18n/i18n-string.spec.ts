import { i18nString, normalizeI18nString, resolveI18nString } from './i18n-string.js';

describe('localized copy', () => {
  it('trims, drops blank entries and enforces bounds', () => {
    expect(normalizeI18nString({ pt: ' Política ', en: ' ' }, { maxLength: 20, required: true })).toEqual({ pt: 'Política' });
    expect(normalizeI18nString({ pt: 'x'.repeat(21) }, { maxLength: 20, required: false })).toBeNull();
    expect(normalizeI18nString({ es: 'Hola' }, { maxLength: 20, required: false })).toBeNull();
    expect(normalizeI18nString({}, { maxLength: 20, required: true })).toBeNull();
    expect(normalizeI18nString(undefined, { maxLength: 20, required: false })).toEqual({});
    expect(() => i18nString(['pt'], { maxLength: 20, required: false })).toThrow();
  });

  it('falls back to the other language', () => {
    expect(resolveI18nString({ en: 'World' }, 'pt')).toBe('World');
    expect(resolveI18nString({ pt: 'Mundo', en: 'World' }, 'en')).toBe('World');
    expect(resolveI18nString(null, 'en')).toBe('');
  });

  it('keeps the frontend list of locales identical', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const frontend = readFileSync(fileURLToPath(new URL('../../../../frontend/src/i18n/locales.ts', import.meta.url)), 'utf8');
    expect(frontend).toContain('export const CONTENT_LOCALES = ["pt", "en"] as const;');
  });
});
