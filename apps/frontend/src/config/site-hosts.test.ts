import { afterEach, describe, expect, it, vi } from "vitest";
import { siteDomain } from "./site-hosts";

describe("site domain", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to localhost in development and normalizes the configured one", () => {
    vi.stubEnv("SITE_DOMAIN", "");
    expect(siteDomain()).toBe("localhost");
    vi.stubEnv("SITE_DOMAIN", " MetaNews.com.br ");
    expect(siteDomain()).toBe("metanews.com.br");
  });

  it("refuses malformed domains and a missing one in production", () => {
    vi.stubEnv("SITE_DOMAIN", "http://x");
    expect(() => siteDomain()).toThrow();
    vi.stubEnv("SITE_DOMAIN", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => siteDomain()).toThrow();
  });
});
