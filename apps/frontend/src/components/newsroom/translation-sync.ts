import { CONTENT_LOCALES, type ContentLocale } from "../../i18n/locales";
import type { TranslationState } from "./contracts";

/**
 * The builder's language sync, as pure functions (the hook `use-translation-sync.ts` adds timers and requests):
 *
 * - While sync is on, editing a field in the SOURCE language translates that field into the other language.
 * - Editing in the OTHER language turns sync off (the person is correcting the translation by hand), unless the
 *   source language is still completely empty: then nothing would be lost, and the language being written becomes
 *   the source.
 * - Resuming translates every field of the chosen source into the other language, overwriting it, and turns sync on.
 */

export const SYNC_FIELDS = ["title", "subtitle", "body", "seoTitle", "seoDescription", "coverCaption"] as const;
export type SyncField = (typeof SYNC_FIELDS)[number];
export type LocaleContent = Record<SyncField, string>;
export type Content = Record<ContentLocale, LocaleContent>;

/** The article body travels as article HTML (its tags kept by the translator); every other field as plain text. */
export const FIELD_FORMAT: Record<SyncField, "plain" | "html"> = {
  title: "plain", subtitle: "plain", body: "html", seoTitle: "plain", seoDescription: "plain", coverCaption: "plain",
};

export const emptyLocaleContent = (): LocaleContent => ({ title: "", subtitle: "", body: "", seoTitle: "", seoDescription: "", coverCaption: "" });

export function otherLocale(locale: ContentLocale): ContentLocale {
  return CONTENT_LOCALES.find((candidate) => candidate !== locale)!;
}

/** Whether a field holds nothing readable: an editor's empty paragraphs count as nothing. */
export function isBlank(field: SyncField, value: string): boolean {
  if (FIELD_FORMAT[field] === "plain") return !value.trim();
  if (/<img\s/i.test(value)) return false;
  return !value.replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();
}

export function languageIsEmpty(content: Content, locale: ContentLocale): boolean {
  return SYNC_FIELDS.every((field) => isBlank(field, content[locale][field]));
}

export type EditOutcome = {
  /** The sync state after the edit. */
  sync: TranslationState;
  /** The translation the edit asks for, when it does. */
  translate: { from: ContentLocale; to: ContentLocale } | null;
  /** What changed in the sync: it paused, or the edited language became the source. */
  change: "paused" | "adopted" | null;
};

/** Decides what an edit of `field` in `locale` does to the sync, given the content BEFORE the edit. */
export function afterEdit(sync: TranslationState, before: Content, locale: ContentLocale): EditOutcome {
  if (!sync.enabled) return { sync, translate: null, change: null };
  if (locale === sync.source) return { sync, translate: { from: locale, to: otherLocale(locale) }, change: null };
  if (languageIsEmpty(before, sync.source)) {
    return { sync: { enabled: true, source: locale }, translate: { from: locale, to: otherLocale(locale) }, change: "adopted" };
  }
  return { sync: { enabled: false, source: sync.source }, translate: null, change: "paused" };
}

/** The fields to send when resuming from `source`: every field, the blank ones answered locally as blank. */
export function resumeRequest(content: Content, source: ContentLocale): Record<string, { text: string; format: "plain" | "html" }> {
  return Object.fromEntries(SYNC_FIELDS.map((field) => [field, { text: isBlank(field, content[source][field]) ? "" : content[source][field], format: FIELD_FORMAT[field] }]));
}

/** Whether resuming would overwrite anything already written in the other language. */
export function resumeOverwrites(content: Content, source: ContentLocale): boolean {
  return !languageIsEmpty(content, otherLocale(source));
}

/**
 * Applies a translation that came back, unless it went stale: the source field changed again since the request
 * (`requestedVersion` behind `currentVersion`) or the sync is no longer running from the same source.
 */
export function applyTranslation(content: Content, sync: TranslationState, request: { from: ContentLocale; field: SyncField; version: number },
  currentVersion: number, translated: string): Content | null {
  if (!sync.enabled || sync.source !== request.from || currentVersion !== request.version) return null;
  const to = otherLocale(request.from);
  if (content[to][request.field] === translated) return content;
  return { ...content, [to]: { ...content[to], [request.field]: translated } };
}
