import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { getMessagesForLocale } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  return { locale, timeZone: "America/Sao_Paulo", messages: getMessagesForLocale(locale) };
});
