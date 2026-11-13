import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(__dirname, "..");
const dockerfile = readFileSync(resolve(project, "Dockerfile"), "utf8");

describe("production image", () => {
  it("starts Next.js through Node itself, with no npm process in between", () => {
    expect(/^CMD (.+)$/m.exec(dockerfile)?.[1]).toBe('["node", "node_modules/next/dist/bin/next", "start"]');
  });

  it("runs the repository's Node version in every stage", () => {
    const version = readFileSync(resolve(project, "..", "..", ".nvmrc"), "utf8").trim();
    const stages = [...dockerfile.matchAll(/^FROM node:(\S+?)-alpine\b/gm)].map((match) => match[1]);
    expect(stages.length).toBeGreaterThan(1);
    expect(new Set(stages)).toEqual(new Set([version]));
  });

  it("ships the documentation read from disk and takes no setting at build time", () => {
    expect(dockerfile).toMatch(/^COPY --from=build \/app\/content \.\/content$/m);
    expect(dockerfile).not.toMatch(/^\s*ARG\s/m);
    expect(dockerfile.match(/^\s*ENV\s.*$/gm)).toEqual(["ENV NEXT_TELEMETRY_DISABLED=1", "ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000"]);
  });
});
