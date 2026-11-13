import { describe, expect, it } from "vitest";
import { localizedPathname } from "./navigation";
import { isAuthenticationPath, routeFromPathname } from "./routing";

const id = "6c9e24fc-dc24-41a1-974a-de796b3e91b8";

describe("routes", () => {
  it("translates a page's address keeping its id or slug", () => {
    expect(localizedPathname(`/pt/noticias/${id}`, "panel", "en")).toBe(`/en/news/${id}`);
    expect(localizedPathname("/pt/noticia/meu-titulo", "site", "en")).toBe("/en/news/meu-titulo");
    expect(localizedPathname("/en/section/world", "site", "pt")).toBe("/pt/editoria/world");
  });

  it("prefers a fixed address over a parameter and keeps the areas apart", () => {
    expect(routeFromPathname("/pt/noticias/nova", "panel")).toBe("/panel/news/new");
    expect(routeFromPathname(`/pt/noticias/${id}`, "panel")).toBe("/panel/news/[id]");
    expect(routeFromPathname("/pt/dashboard", "site")).toBeUndefined();
    expect(routeFromPathname("/pt/%E0%A4%A", "site")).toBeUndefined();
  });

  it("marks the sign-in pages as authentication pages", () => {
    expect(isAuthenticationPath("/en/login", "panel")).toBe(true);
    expect(isAuthenticationPath("/en/news", "panel")).toBe(false);
  });
});
