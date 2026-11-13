import { z } from "zod";
import { brandingSchema, type Branding } from "../../tokens/branding";

/** The format of an exported theme file: identifiable, versioned, and nothing but data. */
export const THEME_FILE_FORMAT = "portal-meta-news/theme";
export const THEME_FILE_MAX_BYTES = 64 * 1024;

const fileSchema = z.object({
  format: z.literal(THEME_FILE_FORMAT), version: z.literal(1),
  name: z.string().trim().min(1).max(80), description: z.string().trim().max(300).default(""), tokens: brandingSchema,
}).strict();

export type ThemeFile = { name: string; description: string; tokens: Branding };

/** The JSON a theme exports to, pretty-printed for whoever opens it. */
export function themeFileContent(theme: ThemeFile): string {
  return `${JSON.stringify({ format: THEME_FILE_FORMAT, version: 1, name: theme.name, description: theme.description, tokens: theme.tokens }, null, 2)}\n`;
}

/** A file name for a theme: its name in lowercase ASCII words joined by hyphens. */
export function themeFileName(name: string): string {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "tema"}.theme.json`;
}

/**
 * Reads a theme file: an export of this panel, or a bare tokens object (then named after the file). Anything that
 * does not validate completely is refused, so an import never creates a theme the site cannot render.
 */
export function parseThemeFile(text: string, fileName: string): { ok: true; theme: ThemeFile } | { ok: false; error: "invalid" | "tooLarge" } {
  if (new Blob([text]).size > THEME_FILE_MAX_BYTES) return { ok: false, error: "tooLarge" };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "invalid" }; }
  const exported = fileSchema.safeParse(data);
  if (exported.success) return { ok: true, theme: { name: exported.data.name, description: exported.data.description, tokens: exported.data.tokens } };
  const tokens = brandingSchema.safeParse(data);
  if (!tokens.success) return { ok: false, error: "invalid" };
  const name = fileName.replace(/(\.theme)?\.json$/i, "").replace(/[-_]+/g, " ").trim().slice(0, 80) || "Tema importado";
  return { ok: true, theme: { name, description: "", tokens: tokens.data } };
}
