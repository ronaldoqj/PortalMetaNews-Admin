import type { MantineColorScheme, MantineColorSchemeManager } from "@mantine/core";

/**
 * The viewer's colour-scheme preference: `light`, `dark` or `auto` (follow the system). It lives in a
 * first-party cookie with one of three fixed values, read on the server so the first response already
 * renders the chosen scheme. It identifies nobody and is never sent to the API or logged.
 */
export const COLOR_SCHEME_COOKIE = "pmn-color-scheme";
export const COLOR_SCHEME_PREFERENCES = ["light", "dark", "auto"] as const;
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function parseColorScheme(value: string | undefined | null): MantineColorScheme {
  return (COLOR_SCHEME_PREFERENCES as readonly string[]).includes(value ?? "") ? value as MantineColorScheme : "auto";
}

/**
 * Resolves `auto` before the first paint. Rendered only for that preference; the content is static,
 * so a future Content Security Policy can allow it by hash.
 */
export const AUTO_COLOR_SCHEME_SCRIPT = "try{document.documentElement.setAttribute('data-mantine-color-scheme',"
  + "matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}";

function readCookie(): string | undefined {
  return document.cookie.split("; ").find((entry) => entry.startsWith(`${COLOR_SCHEME_COOKIE}=`))?.slice(COLOR_SCHEME_COOKIE.length + 1);
}

function writeCookie(value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COLOR_SCHEME_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** Mantine's colour-scheme storage backed by the preference cookie instead of localStorage. */
export function cookieColorSchemeManager(): MantineColorSchemeManager {
  return {
    get: (fallback) => {
      try {
        const value = readCookie();
        return value ? parseColorScheme(value) : fallback;
      } catch {
        return fallback;
      }
    },
    set: (value) => {
      try {
        writeCookie(value, MAX_AGE_SECONDS);
      } catch {
        // Without cookies the choice still applies to the current page.
      }
    },
    subscribe: () => {},
    unsubscribe: () => {},
    clear: () => {
      try {
        writeCookie("", 0);
      } catch {
        // Nothing stored.
      }
    },
  };
}
