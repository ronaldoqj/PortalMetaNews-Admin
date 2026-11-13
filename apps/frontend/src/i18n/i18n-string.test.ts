import { describe, expect, it } from "vitest";
import * as api from "../../../backend/src/common/i18n/locales";
import { CONTENT_LOCALES, i18nStringSchema, resolveI18nString } from "./i18n-string";
import { routing } from "./routing";

describe("localized copy", () => {
  it("offers exactly the API's languages, which are also the route prefixes", () => {
    expect([...CONTENT_LOCALES]).toEqual([...api.CONTENT_LOCALES]);
    expect([...routing.locales]).toEqual([...CONTENT_LOCALES]);
  });

  it("falls back to the other language when one is blank", () => {
    expect(resolveI18nString({ pt: "Política", en: "Politics" }, "en")).toBe("Politics");
    expect(resolveI18nString({ pt: "Política", en: "  " }, "en")).toBe("Política");
    expect(resolveI18nString(undefined, "pt")).toBe("");
  });

  it("validates bounds and the required base", () => {
    const schema = i18nStringSchema({ maxLength: 5, required: true });
    expect(schema.safeParse({ pt: "abc" }).success).toBe(true);
    expect(schema.safeParse({ pt: "", en: "" }).success).toBe(false);
    expect(schema.safeParse({ pt: "abcdef" }).success).toBe(false);
    expect(schema.safeParse({ es: "x" }).success).toBe(false);
  });
});
