"use client";

import { AUTO_COLOR_SCHEME_SCRIPT } from "./color-scheme";

/**
 * Resolves the `auto` scheme before the first paint. Only the server markup executes it; when React
 * renders the head on the client (e.g. a not-found boundary) the element is an inert data block,
 * since a client-created script never runs and React 19 reports it as an error.
 */
export function ColorSchemeScript() {
  return <script
    suppressHydrationWarning
    type={typeof window === "undefined" ? undefined : "text/plain"}
    dangerouslySetInnerHTML={{ __html: AUTO_COLOR_SCHEME_SCRIPT }}
  />;
}
