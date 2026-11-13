import { useLocale } from "next-intl";
import { z } from "zod";
import { CONTENT_LOCALES, type ContentLocale } from "./locales";

export { CONTENT_LOCALES, type ContentLocale } from "./locales";

/** Copy the newsroom writes in each language (`{ pt?, en? }`); a missing entry falls back to the other language. */
export type I18nString = Partial<Record<ContentLocale, string>>;

/** Shape and bounds of stored or edited copy; the API normalizes it again. */
export function i18nStringSchema({ maxLength, required }: { maxLength: number; required: boolean }) {
  const entry = z.string().trim().max(maxLength);
  return z.strictObject({ pt: entry.optional(), en: entry.optional() })
    .refine((value) => !required || CONTENT_LOCALES.some((locale) => !!value[locale]?.length)) satisfies z.ZodType<I18nString>;
}

export const emptyI18nString = (): I18nString => ({ pt: "", en: "" });

/** The text for an interface locale, falling back to the other language when blank. */
export function resolveI18nString(value: I18nString | null | undefined, locale: string): string {
  if (!value) return "";
  const primary: ContentLocale = locale.startsWith("pt") ? "pt" : "en";
  return value[primary]?.trim() || CONTENT_LOCALES.map((other) => value[other]?.trim()).find(Boolean) || "";
}

/** Resolver bound to the locale of the current route. */
export function useI18nString(): (value: I18nString | null | undefined) => string {
  const locale = useLocale();
  return (value) => resolveI18nString(value, locale);
}
