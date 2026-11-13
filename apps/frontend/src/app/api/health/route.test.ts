import { describe, expect, it } from "vitest";
import { config } from "../../../proxy";
import { GET } from "./route";

describe("frontend health check", () => {
  it("answers ok, never cached", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("stays outside the proxy, so any host reaches it", () => {
    const proxied = new RegExp(`^${config.matcher}$`);
    expect(proxied.test("/pt-BR/dashboard")).toBe(true);
    expect(proxied.test("/api/health")).toBe(false);
  });
});
