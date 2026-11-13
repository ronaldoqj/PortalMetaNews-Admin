import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ getRequestConfig: (configuration: unknown) => configuration }));

import getRequestConfig from "./request";

describe("internationalized request configuration", () => {
  it.each([["pt", "pt"], ["en", "en"], ["invalid", "pt"]])("serves %s as %s with its catalog", async (requested, locale) => {
    const configuration = await getRequestConfig({ requestLocale: Promise.resolve(requested) });
    expect(configuration).toMatchObject({ locale });
    const onError = vi.fn();
    const translate = createTranslator({ locale, messages: configuration.messages!, onError });
    expect(translate("Common.brand")).toBe("Portal Meta News");
    expect(onError).not.toHaveBeenCalled();
  });
});
