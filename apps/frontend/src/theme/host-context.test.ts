import { describe, expect, it } from "vitest";
import { areaUrl, hostAliases, resolveHostContext } from "./host-context";

describe("host context", () => {
  it("serves the site on the bare domain and the panel on painel.", () => {
    expect(resolveHostContext("localhost:3027", "/pt/noticia/x", "localhost")).toMatchObject({ surface: "site", rootRoute: "/site" });
    expect(resolveHostContext("127.0.0.1:3027", "/en", "localhost").surface).toBe("site");
    expect(resolveHostContext("painel.localhost:3027", "/pt/noticias", "localhost")).toMatchObject({ surface: "panel", rootRoute: "/panel/dashboard" });
    expect(resolveHostContext("painel.metanews.com.br", "/", "metanews.com.br").surface).toBe("panel");
  });

  it("refuses unknown hosts and pages of the other area", () => {
    expect(() => resolveHostContext("evil.localhost:3027", "/pt", "localhost")).toThrow();
    expect(() => resolveHostContext("localhost:3027", "/pt/noticias", "localhost")).toThrow();
    expect(() => resolveHostContext("painel.localhost:3027", "/pt/noticia/x", "localhost")).toThrow();
    expect(() => resolveHostContext("bad host", "/", "localhost")).toThrow();
  });

  it("redirects aliases and builds area URLs", () => {
    expect(hostAliases("metanews.com.br").get("admin.metanews.com.br")).toBe("panel");
    expect(hostAliases("metanews.com.br").get("www.metanews.com.br")).toBe("site");
    expect(hostAliases("localhost").has("www.localhost")).toBe(false);
    expect(areaUrl("panel", "localhost:3027", "localhost", "/pt/login")).toBe("http://painel.localhost:3027/pt/login");
    expect(areaUrl("site", "painel.metanews.com.br", "metanews.com.br", "/en")).toBe("https://metanews.com.br/en");
  });
});
