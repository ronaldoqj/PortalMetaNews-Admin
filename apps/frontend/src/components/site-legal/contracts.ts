import { z } from "zod";

/** Mirrors the API (`modules/site/site-legal.ts`): the site's legal documents, one edition per language. */
export const LEGAL_KINDS = ["privacy", "terms"] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];
export const LEGAL_EDITIONS = ["pt", "en"] as const;
export type LegalEdition = (typeof LEGAL_EDITIONS)[number];
export const LEGAL_LIMITS = { title: 160, summary: 400, content: 100_000 } as const;

export const legalTextSchema = z.object({
  title: z.string().trim().min(1).max(LEGAL_LIMITS.title),
  summary: z.string().max(LEGAL_LIMITS.summary),
  content: z.string().trim().min(1).max(LEGAL_LIMITS.content),
}).strict();
export type LegalText = z.infer<typeof legalTextSchema>;

/** What the site shows: the panel's text, or the default shipped with the code (`isDefault`, `updatedAt` null). */
export const publishedLegalSchema = z.object({
  kind: z.enum(LEGAL_KINDS), edition: z.enum(LEGAL_EDITIONS),
  title: z.string(), summary: z.string(), content: z.string(),
  isDefault: z.boolean(), updatedAt: z.iso.datetime().nullable(), updatedBy: z.string().nullable(),
});
export type PublishedLegal = z.infer<typeof publishedLegalSchema>;

/** One edition in the panel, with the default a restore brings back. */
export const legalEditionSchema = publishedLegalSchema.extend({
  defaults: z.object({ title: z.string(), summary: z.string(), content: z.string() }),
});
export type LegalEditionData = z.infer<typeof legalEditionSchema>;
