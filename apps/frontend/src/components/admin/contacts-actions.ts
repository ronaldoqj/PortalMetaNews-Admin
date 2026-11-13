"use server";

import { z } from "zod";
import { actOnResource } from "./resource";
import { CONTACT_STATUSES, contactMessageSchema } from "./contacts-contracts";
import { INVALID_INPUT, type ApiResult } from "./api-result";

/** Moves a reader's message between new, read and archived; the first reader is kept. */
export async function setContactStatus(id: string, status: string): Promise<ApiResult> {
  const parsed = z.enum(CONTACT_STATUSES).safeParse(status);
  if (!parsed.success) return INVALID_INPUT;
  const result = await actOnResource("panel/contacts", id, "status", { method: "PUT", body: { status: parsed.data }, permission: "contacts:read", schema: contactMessageSchema });
  return result.ok ? { ok: true, data: null } : result;
}
