"use server";

import { panelApi } from "../admin/api-call";
import { INVALID_INPUT, type ApiResult } from "../admin/api-result";
import { LEGAL_EDITIONS, LEGAL_KINDS, legalEditionSchema, legalTextSchema, type LegalEditionData } from "./contracts";

const known = (kind: unknown, edition: unknown) => (LEGAL_KINDS as readonly unknown[]).includes(kind) && (LEGAL_EDITIONS as readonly unknown[]).includes(edition);

/** Saves an edition's own text (title, summary and Markdown content); the site shows it on its next request. */
export async function saveLegalDocument(kind: string, edition: string, input: unknown): Promise<ApiResult<LegalEditionData>> {
  const parsed = legalTextSchema.safeParse(input);
  if (!parsed.success || !known(kind, edition)) return INVALID_INPUT;
  return panelApi(`panel/legal/${kind}/${edition}`, { method: "PUT", body: parsed.data, permission: "site:manage", schema: legalEditionSchema, revalidate: true });
}

/** Brings back the default text of an edition. */
export async function restoreLegalDocument(kind: string, edition: string): Promise<ApiResult<LegalEditionData>> {
  if (!known(kind, edition)) return INVALID_INPUT;
  return panelApi(`panel/legal/${kind}/${edition}`, { method: "DELETE", permission: "site:manage", schema: legalEditionSchema, revalidate: true });
}
