/**
 * The languages of the portal: of its interface (each one a route prefix) and of everything the newsroom writes.
 * Mirrors the API's `common/i18n/locales.ts` (contract-tested). Adding a language means adding it here, in the API,
 * in the database checks and a catalog under `messages/`.
 */
export const CONTENT_LOCALES = ["pt", "en"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export function isContentLocale(value: unknown): value is ContentLocale {
  return (CONTENT_LOCALES as readonly unknown[]).includes(value);
}

export function otherLocale(locale: ContentLocale): ContentLocale {
  return locale === "pt" ? "en" : "pt";
}
