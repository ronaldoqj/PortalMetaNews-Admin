import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

/** Committed with the frontend, kept current by `scripts/sync-docs.mjs` while developing; read on each request, so an edit shows on the next load. */
const directory = () => join(process.cwd(), "content", "docs");

const documentSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string(), summary: z.string(), source: z.string(),
  words: z.number().int().nonnegative(),
});
const catalogSchema = z.object({
  groups: z.array(z.object({ title: z.string(), description: z.string(), documents: z.array(documentSchema) })),
});

export type DocumentationEntry = z.infer<typeof documentSchema>;
export type DocumentationGroup = z.infer<typeof catalogSchema>["groups"][number];

/** The published groups, or null when the copy is missing or unreadable. */
export async function readCatalog(): Promise<DocumentationGroup[] | null> {
  try {
    return catalogSchema.parse(JSON.parse(await readFile(join(directory(), "catalog.json"), "utf8"))).groups;
  } catch {
    return null;
  }
}

/** The text of a document of the catalog. The caller passes an entry, so no address ever becomes a path by itself. */
export function readDocument(entry: DocumentationEntry): Promise<string> {
  return readFile(join(directory(), `${entry.slug}.md`), "utf8");
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}
