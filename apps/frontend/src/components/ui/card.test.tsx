import { MantineProvider } from "@mantine/core";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

const root = join(__dirname, "..", "..");
/** The console's and the panel's own files, and the components only they use. */
const ADMIN_AREAS = ["app/[locale]/(super-admin)", "app/[locale]/(tenant-admin)", "components/admin", "components/auth", "components/dashboard",
  "components/site-legal", "components/shared/notification-center.tsx", "components/forms/form-summary-card.tsx",
  "components/reports/report-case-management.tsx", "components/reports/report-communication.tsx", "components/reports/report-evidence.tsx"];

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [path] : [];
  });
}

describe("cards of the console and the panel", () => {
  it("render with the class and attribute the documentation-style rule of globals.css targets", () => {
    const html = renderToStaticMarkup(<MantineProvider><Card withBorder p="lg">Conteúdo</Card></MantineProvider>);
    expect(html).toMatch(/class="[^"]*mantine-Paper-root[^"]*"/);
    expect(html).toContain("data-with-border");
    const css = readFileSync(join(root, "app", "globals.css"), "utf8");
    expect(css).toContain(":where(.panel-workspace, .auth-workspace) .mantine-Paper-root[data-with-border]");
    expect(css).toMatch(/\.app-card-link:hover/);
  });

  it("keep the documentation's medium radius and no resting shadow", () => {
    const offenders = sources(root).filter((path) => ADMIN_AREAS.some((area) => relative(root, path).startsWith(area))).flatMap((path) =>
      [...readFileSync(path, "utf8").matchAll(/<Card\b[^>]*/g)].map(([tag]) => tag)
        .filter((tag) => /\sshadow=/.test(tag) || /radius="(?!md")/.test(tag))
        .map((tag) => `${relative(root, path)}: ${tag.slice(0, 80)}`));
    expect(offenders).toEqual([]);
  });
});
