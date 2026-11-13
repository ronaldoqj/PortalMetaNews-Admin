import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Test helper for the architecture guards: the frontend's own sources, read once, with their imports resolved. */
export const SOURCE_ROOT = resolve(__dirname, "..");

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Every non-test `.ts`/`.tsx` file under `src`, by absolute path, with its text. */
export const sources: ReadonlyMap<string, string> = new Map(walk(SOURCE_ROOT).map((path) => [path, readFileSync(path, "utf8")]));

/** A module whose first statement, after any comment, is the `"use client"` directive. */
export function isClientModule(path: string): boolean {
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(sources.get(path) ?? "");
}

/** The source file an import specifier names (`@/` or relative), or undefined for a package. */
export function resolveImport(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith("@/") ? join(SOURCE_ROOT, specifier.slice(2))
    : specifier.startsWith(".") ? resolve(dirname(from), specifier) : undefined;
  if (!base) return undefined;
  return [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find((candidate) => sources.has(candidate));
}

/** The source files a module imports or re-exports, dynamic imports included. */
export function importsOf(path: string): string[] {
  return [...(sources.get(path) ?? "").matchAll(/(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)]
    .map((match) => resolveImport(path, match[1] ?? match[2])).filter((target): target is string => !!target);
}
