import type { AbstractIntlMessages } from "next-intl";
import type { RouteArea } from "./routing";

/**
 * The catalog namespaces each area may read in the browser: the root layout hands the browser only its area's (each
 * area is a host of its own) instead of the whole catalog on every load. The site's readers never download the
 * panel's copy. A namespace used by a client component of an area must be listed here (`client-messages.test.ts`).
 */
export const CLIENT_NAMESPACES = {
  site: ["Common", "ColorScheme", "Locales", "NotFound", "ErrorPage", "RichText", "Confirmation", "I18nText", "Site", "Article", "Contact"],
  panel: null,
} as const satisfies Record<RouteArea, readonly string[] | null>;

/** The messages an area's browser code may use; the panel (whose accounts are trusted) receives the whole catalog. */
export function clientMessages(messages: AbstractIntlMessages, area: RouteArea): AbstractIntlMessages {
  const namespaces = CLIENT_NAMESPACES[area];
  if (!namespaces) return messages;
  return Object.fromEntries(namespaces.filter((namespace) => namespace in messages).map((namespace) => [namespace, messages[namespace]]));
}
