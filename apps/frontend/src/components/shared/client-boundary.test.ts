import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { isClientModule, resolveImport, SOURCE_ROOT, sources } from "@/test-support/sources";

describe("client boundary", () => {
  it("keeps server modules from importing values other than components from a \"use client\" module", () => {
    // On the server such an import is a client reference, not the value: a constant read there is not the constant.
    const offenders = [...sources].filter(([path]) => !isClientModule(path)).flatMap(([path, text]) =>
      [...text.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)].flatMap(([, typeOnly, names, specifier]) => {
        const target = typeOnly ? undefined : resolveImport(path, specifier);
        if (!target || !isClientModule(target)) return [];
        return names.split(",").map((name) => name.trim()).filter((name) => name && !name.startsWith("type "))
          .map((name) => name.split(/\s+as\s+/)[0])
          .filter((name) => !/^[A-Z][a-z]/.test(name) || /^[A-Z0-9_]+$/.test(name))
          .map((name) => `${relative(SOURCE_ROOT, path)}: ${name} from ${relative(SOURCE_ROOT, target)}`);
      }));
    expect(offenders).toEqual([]);
  });

  // In a Server Component, a client component is only a reference: `Grid.Col` or `Tabs.Panel`
  // resolves to undefined and the page fails at runtime with "Element type is invalid".
  it("keeps server components from using dot-notation subcomponents of client libraries", () => {
    const offenders = [...sources].filter(([path]) => path.endsWith(".tsx") && !isClientModule(path))
      .flatMap(([path, text]) => [...text.matchAll(/<([A-Z][A-Za-z]*\.[A-Z][A-Za-z]*)/g)]
        .map((match) => `${relative(SOURCE_ROOT, path)}: <${match[1]}>`));
    expect(offenders).toEqual([]);
  });
});
