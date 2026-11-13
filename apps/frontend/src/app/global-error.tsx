"use client";

import { usePathname } from "next/navigation";

import { fontVariables } from "@/app/fonts";
import { routing, type AppLocale } from "@/i18n/routing";
import catalog from "../../messages/global-error.json";

/**
 * The last resort, when the root layout itself fails: it replaces the whole document, without the
 * translation provider, the theme or the area's identity. Its copy comes from its own small catalog (the
 * `ErrorPage` texts, kept identical by `global-error.test.ts`), so no page ships the full catalogs.
 */
function copy(locale: AppLocale) {
  return catalog[locale];
}

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const segment = usePathname()?.split("/")[1];
  const locale = routing.locales.find((candidate) => candidate === segment) ?? routing.defaultLocale;
  const text = copy(locale);

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <title>{text.title}</title>
        <style>{`
          body { margin: 0; font-family: var(--font-manrope), sans-serif; color: #1f2933; background: #fff; }
          main { max-width: 36rem; margin: 0 auto; padding: 120px 24px; }
          h1 { font-size: 2rem; margin: 0 0 12px; }
          p { font-size: 1.125rem; color: #52606d; margin: 0 0 32px; }
          button { font: inherit; font-weight: 600; padding: 10px 20px; border-radius: 8px; border: 0; cursor: pointer; color: #fff; background: #1f2933; }
          @media (prefers-color-scheme: dark) {
            body { color: #e4e7eb; background: #1a1b1e; }
            p { color: #9aa5b1; }
            button { color: #1a1b1e; background: #e4e7eb; }
          }
        `}</style>
        <main>
          <h1>{text.title}</h1>
          <p>{text.description}</p>
          <button type="button" onClick={retry}>{text.retry}</button>
        </main>
      </body>
    </html>
  );
}
