import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "..", "..", "app", "[locale]");
/** Areas whose pages are all dynamic and whose frame is a layout that stays while a page loads. */
const AREAS = ["(panel)/panel/(authenticated)", "(site)/site"];

function folders(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    .flatMap((entry) => [join(directory, entry.name), ...folders(join(directory, entry.name))]);
}

function hasPages(directory: string): boolean {
  return existsSync(join(directory, "page.tsx")) || folders(directory).some((folder) => existsSync(join(folder, "page.tsx")));
}

describe("loading boundaries", () => {
  it("covers every navigation of the panel and the site", () => {
    // A boundary covers the pages directly under its folder, so each folder holding pages below it needs one.
    const missing = AREAS.flatMap((area) => [join(app, area), ...folders(join(app, area))])
      .filter((folder) => (existsSync(join(folder, "page.tsx")) || folders(folder).some(hasPages)) && !existsSync(join(folder, "loading.tsx")))
      .map((folder) => relative(app, folder));
    expect(missing).toEqual([]);
  });
});
