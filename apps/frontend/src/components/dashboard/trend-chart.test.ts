import { createRequire } from "node:module";
import { Fragment, createElement } from "react";
import { describe, expect, it } from "vitest";

/**
 * Recharts 2 finds its series through `react-is`, unwrapping fragments on the way. Mantine wraps each area
 * of an AreaChart in a fragment (its gradient plus the area), so a `react-is` older than React drops every
 * area and the chart renders only its grid. The `overrides` entry in package.json keeps them in step.
 */
describe("charting dependencies", () => {
  const fromRecharts = createRequire(createRequire(import.meta.url).resolve("recharts"));

  it("resolves the react-is of the installed React for Recharts", () => {
    const { version: react } = fromRecharts("react/package.json") as { version: string };
    const { version: reactIs } = fromRecharts("react-is/package.json") as { version: string };
    expect(reactIs).toBe(react);
  });

  it("recognizes fragments created by this React", () => {
    const { isFragment } = fromRecharts("react-is") as { isFragment: (value: unknown) => boolean };
    expect(isFragment(createElement(Fragment))).toBe(true);
  });
});
