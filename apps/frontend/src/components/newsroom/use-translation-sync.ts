"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ContentLocale } from "../../i18n/locales";
import type { ApiFailure } from "../admin/api-result";
import { translateFields } from "./actions";
import type { TranslationState } from "./contracts";
import {
  afterEdit, applyTranslation, FIELD_FORMAT, otherLocale, resumeRequest, SYNC_FIELDS, type Content, type SyncField,
} from "./translation-sync";

/** How long the builder waits after the last keystroke in a field before translating it. */
export const TRANSLATION_DEBOUNCE_MS = 1200;

const key = (locale: ContentLocale, field: SyncField) => `${locale}.${field}`;

/**
 * The builder's language sync around the pure rules of `translation-sync.ts`: each edit is recorded with a version per
 * field, edits of the source language are translated after a pause in typing, answers that went stale are dropped,
 * and `resume` translates a whole language at once. `active` is false while the AI cannot answer or the account may
 * not edit: edits then only change the content.
 */
export function useTranslationSync({ content, setContent, sync, setSync, active }: {
  content: Content; setContent: (content: Content) => void; sync: TranslationState; setSync: (sync: TranslationState) => void; active: boolean;
}) {
  // Edits and answers arrive between renders: the latest content lives here and every change goes through `commit`.
  const contentRef = useRef<Content>(content);
  const syncRef = useRef(sync);
  const versions = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  /** Fields of the target being translated now, and fields last filled by the translation (until edited by hand). */
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [automatic, setAutomatic] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [simulated, setSimulated] = useState(false);
  useEffect(() => { syncRef.current = sync; }, [sync]);
  const commit = useCallback((next: Content) => { contentRef.current = next; setContent(next); }, [setContent]);
  useEffect(() => () => { for (const timer of Object.values(timers.current)) clearTimeout(timer); }, []);

  const mark = (setter: Dispatch<SetStateAction<ReadonlySet<string>>>, name: string, on: boolean) =>
    setter((current) => {
      if (current.has(name) === on) return current;
      const next = new Set(current);
      if (on) next.add(name); else next.delete(name);
      return next;
    });

  const translate = useCallback(async (from: ContentLocale, field: SyncField, version: number) => {
    const to = otherLocale(from);
    const text = contentRef.current[from][field];
    mark(setPending, key(to, field), true);
    const result = await translateFields({ from, to, fields: { [field]: { text, format: FIELD_FORMAT[field] } } })
      .catch((): ApiFailure => ({ ok: false, error: "unavailable" }));
    mark(setPending, key(to, field), false);
    if (!result.ok) return setFailure(result);
    setFailure(null);
    setSimulated(result.data.simulated);
    const current = contentRef.current;
    const next = applyTranslation(current, syncRef.current, { from, field, version }, versions.current[key(from, field)] ?? 0, result.data.fields[field] ?? "");
    if (!next || next === current) return;
    commit(next);
    mark(setAutomatic, key(to, field), true);
  }, [commit]);

  /** Records an edit of one field and decides what it does to the sync. */
  const edit = useCallback((locale: ContentLocale, field: SyncField, value: string) => {
    const before = contentRef.current;
    commit({ ...before, [locale]: { ...before[locale], [field]: value } });
    const name = key(locale, field);
    versions.current[name] = (versions.current[name] ?? 0) + 1;
    mark(setAutomatic, name, false);
    if (!active) return;
    // Only the source language decides (is it still empty?), and an edit of the other language never changes it.
    const outcome = afterEdit(syncRef.current, before, locale);
    if (outcome.sync.enabled !== syncRef.current.enabled || outcome.sync.source !== syncRef.current.source) {
      syncRef.current = outcome.sync;
      setSync(outcome.sync);
    }
    if (!outcome.translate) return;
    clearTimeout(timers.current[name]);
    const version = versions.current[name];
    const from = outcome.translate.from;
    timers.current[name] = setTimeout(() => void translate(from, field, version), TRANSLATION_DEBOUNCE_MS);
  }, [active, commit, setSync, translate]);

  /** Translates every field of `source` into the other language, overwriting it, and turns the sync on from there. */
  const resume = useCallback(async (source: ContentLocale): Promise<boolean> => {
    const content = contentRef.current;
    const to = otherLocale(source);
    for (const field of SYNC_FIELDS) mark(setPending, key(to, field), true);
    const result = await translateFields({ from: source, to, fields: resumeRequest(content, source) })
      .catch((): ApiFailure => ({ ok: false, error: "unavailable" }));
    for (const field of SYNC_FIELDS) mark(setPending, key(to, field), false);
    if (!result.ok) { setFailure(result); return false; }
    setFailure(null);
    setSimulated(result.data.simulated);
    const translated = Object.fromEntries(SYNC_FIELDS.map((field) => [field, result.data.fields[field] ?? ""])) as Record<SyncField, string>;
    commit({ ...contentRef.current, [to]: translated });
    for (const field of SYNC_FIELDS) versions.current[key(to, field)] = (versions.current[key(to, field)] ?? 0) + 1;
    setAutomatic(new Set(SYNC_FIELDS.map((field) => key(to, field))));
    syncRef.current = { enabled: true, source };
    setSync(syncRef.current);
    return true;
  }, [commit, setSync]);

  /** Keeps the hook's copy of the content in step when the whole content is replaced (a restored revision). */
  const reset = useCallback((next: Content) => {
    commit(next);
    for (const timer of Object.values(timers.current)) clearTimeout(timer);
    timers.current = {};
    setAutomatic(new Set());
  }, [commit]);

  return {
    edit, resume, reset, failure, simulated,
    isPending: (locale: ContentLocale, field: SyncField) => pending.has(key(locale, field)),
    isAutomatic: (locale: ContentLocale, field: SyncField) => automatic.has(key(locale, field)),
  };
}
