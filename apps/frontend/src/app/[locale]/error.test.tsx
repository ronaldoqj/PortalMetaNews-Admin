import { describe, expect, it } from "vitest";
import ErrorPage from "./error";
import { renderMarkup } from "@/test-support/render";

const html = (locale: "pt" | "en", error: Error & { digest?: string }) => renderMarkup(<ErrorPage error={error} retry={() => undefined} />, { locale });

describe("error page", () => {
  it.each([
    ["pt", "Algo deu errado", "Tentar novamente", 'href="/pt"'],
    ["en", "Something went wrong", "Try again", 'href="/en"'],
  ] as const)("speaks %s and leads home", (locale, title, retry, home) => {
    const text = html(locale, Object.assign(new Error("x"), { digest: "410776101" }));
    expect(text).toContain(title);
    expect(text).toContain(retry);
    expect(text).toContain(home);
    expect(text).toContain("410776101");
  });

  it("never shows the error's own message", () => {
    expect(html("en", new Error("password=secret at /internal/path"))).not.toContain("secret");
  });
});
