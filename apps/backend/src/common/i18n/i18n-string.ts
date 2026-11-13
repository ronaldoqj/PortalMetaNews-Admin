import { BadRequestException } from '@nestjs/common';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { CONTENT_LOCALES, type ContentLocale } from './locales.js';

export { CONTENT_LOCALES, isContentLocale, otherLocale, type ContentLocale } from './locales.js';

/**
 * Copy the newsroom writes in each language (`{ pt?, en? }`): names, captions, titles. A missing or blank entry falls
 * back to the other language when shown; identifiers and slugs never depend on it.
 */
export type I18nString = Partial<Record<ContentLocale, string>>;

export interface I18nStringRules {
  maxLength: number;
  /** When true at least one language must hold text. */
  required: boolean;
}

function isShape(value: unknown, maxLength: number): value is I18nString {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([locale, text]) =>
    (CONTENT_LOCALES as readonly string[]).includes(locale) && typeof text === 'string' && text.trim().length <= maxLength);
}

/** The trimmed copy with blank entries dropped, or `null` when it does not fit the rules. */
export function normalizeI18nString(value: unknown, { maxLength, required }: I18nStringRules): I18nString | null {
  if (value === undefined || value === null) return required ? null : {};
  if (!isShape(value, maxLength)) return null;
  const result: I18nString = {};
  for (const locale of CONTENT_LOCALES) {
    const text = value[locale]?.trim();
    if (text) result[locale] = text;
  }
  if (required && !Object.keys(result).length) return null;
  return result;
}

/** Normalizes copy, refusing the request (400) when it does not fit. */
export function i18nString(value: unknown, rules: I18nStringRules): I18nString {
  const normalized = normalizeI18nString(value, rules);
  if (!normalized) throw new BadRequestException({ statusCode: 400, message: 'Invalid localized text', code: 'invalid_i18n' });
  return normalized;
}

/** Shape check for request bodies; the service then normalizes it. */
export function IsI18nString(rules: I18nStringRules, options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({
    name: 'isI18nString',
    target: target.constructor,
    propertyName: String(propertyName),
    options: { message: `$property must be localized text of at most ${rules.maxLength} characters`, ...options },
    validator: { validate: (value: unknown) => value === undefined || normalizeI18nString(value, { ...rules, required: false }) !== null },
  });
}

/** The text for a locale, falling back to the other language. */
export function resolveI18nString(value: I18nString | null | undefined, locale: ContentLocale): string {
  if (!value) return '';
  return value[locale]?.trim() || CONTENT_LOCALES.map((other) => value[other]?.trim()).find(Boolean) || '';
}
