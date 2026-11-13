import { describe, expect, it } from "vitest";
import globalError from "../../messages/global-error.json";
import { getMessagesForLocale, type MessageTree } from "../i18n/messages";

/** The texts the root layout's last-resort page shows must be the ones the main catalogs resolve. */
describe("global error copy", () => {
  it.each(["pt", "en"] as const)("matches the ErrorPage catalog in %s", (locale) => {
    const page = getMessagesForLocale(locale).ErrorPage as MessageTree;
    const own = globalError[locale];
    expect(own).toEqual({ title: page.title, description: page.description, retry: page.retry });
  });
});
