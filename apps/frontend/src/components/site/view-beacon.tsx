"use client";

import { useEffect } from "react";

/**
 * Counts one read of an article: a single POST after the page shows, without cookies, identifiers or anything about
 * the reader (the API keeps only a count per day). Crawlers that run no script are not counted.
 */
export function ViewBeacon({ id, locale }: { id: string; locale: string }) {
  useEffect(() => {
    const key = `pmn-view-${id}`;
    // A reload in the same tab is not a new read.
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* storage off: count anyway */ }
    void fetch(`/${locale}/api/view/${id}`, { method: "POST", credentials: "omit", keepalive: true, cache: "no-store" }).catch(() => undefined);
  }, [id, locale]);
  return null;
}
