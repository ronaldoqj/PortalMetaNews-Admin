import { CONTENT_LOCALES, type ContentLocale } from "../../i18n/locales";
import type { Localized, NewsPatch, NewsView, TranslationState } from "./contracts";
import { isBlank, SYNC_FIELDS, type Content } from "./translation-sync";

/** Everything the builder edits, in the shape the screen works with: content per language, then the item's settings. */
export type BuilderState = {
  content: Content;
  slug: Localized;
  categoryId: string | null;
  coverMediaId: string | null;
  authorId: string | null;
  tagIds: string[];
  locales: ContentLocale[];
  featured: boolean;
  breaking: boolean;
  translation: TranslationState;
};

export function stateOf(view: NewsView): BuilderState {
  const content = Object.fromEntries(CONTENT_LOCALES.map((locale) => [locale, Object.fromEntries(SYNC_FIELDS.map((field) => [field, view[field][locale] ?? ""]))])) as Content;
  return {
    content, slug: { ...view.slug }, categoryId: view.categoryId, coverMediaId: view.coverMediaId, authorId: view.authorId, tagIds: view.tags.map((tag) => tag.id),
    locales: [...view.locales], featured: view.featured, breaking: view.breaking, translation: { ...view.translation },
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Only what changed since the last save: a localized field travels whole (both languages), a slug per language. */
export function patchOf(saved: BuilderState, current: BuilderState): Omit<NewsPatch, "expectedUpdatedAt"> {
  const patch: Omit<NewsPatch, "expectedUpdatedAt"> = {};
  for (const field of SYNC_FIELDS) {
    if (CONTENT_LOCALES.every((locale) => saved.content[locale][field] === current.content[locale][field])) continue;
    patch[field] = Object.fromEntries(CONTENT_LOCALES.map((locale) => [locale, isBlank(field, current.content[locale][field]) ? "" : current.content[locale][field]]));
  }
  const slug = Object.fromEntries(CONTENT_LOCALES.filter((locale) => (saved.slug[locale] ?? "") !== (current.slug[locale] ?? "")).map((locale) => [locale, current.slug[locale] ?? ""]));
  if (Object.keys(slug).length) patch.slug = slug;
  if (saved.categoryId !== current.categoryId) patch.categoryId = current.categoryId;
  if (saved.coverMediaId !== current.coverMediaId) patch.coverMediaId = current.coverMediaId;
  if (saved.authorId !== current.authorId) patch.authorId = current.authorId;
  if (!same(saved.tagIds, current.tagIds)) patch.tagIds = current.tagIds;
  if (!same([...saved.locales].sort(), [...current.locales].sort())) patch.locales = current.locales;
  if (saved.featured !== current.featured) patch.featured = current.featured;
  if (saved.breaking !== current.breaking) patch.breaking = current.breaking;
  if (!same(saved.translation, current.translation)) patch.translation = current.translation;
  return patch;
}

/** What a language still lacks to be published: its title and its body (the address comes from the title). */
export function missingFor(state: BuilderState, locale: ContentLocale): Array<"title" | "body"> {
  return (["title", "body"] as const).filter((field) => isBlank(field, state.content[locale][field]));
}
