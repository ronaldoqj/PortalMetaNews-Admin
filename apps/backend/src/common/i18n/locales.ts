/**
 * The languages of the portal: of its interface and of everything the newsroom writes (news, categories, tags,
 * captions). Adding one later means adding it here, in the frontend's `i18n/locales.ts` and to the database checks.
 * Kept identical to the frontend's list by a contract test, so this file has no dependencies.
 */
export const CONTENT_LOCALES = ['pt', 'en'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export function isContentLocale(value: unknown): value is ContentLocale {
  return (CONTENT_LOCALES as readonly unknown[]).includes(value);
}

/** The other language of a pair, for translation. */
export function otherLocale(locale: ContentLocale): ContentLocale {
  return locale === 'pt' ? 'en' : 'pt';
}
