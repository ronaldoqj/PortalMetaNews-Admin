import "server-only";

import { z } from "zod";
import { panelApi } from "./api-call";
import type { Permission } from "./permissions";
import { INVALID_INPUT, type ApiResult } from "./api-result";

type Options<Data> = { permission?: Permission | readonly Permission[]; schema?: z.ZodType<Data>; update?: "PATCH" | "PUT" };

const validId = (id: unknown): id is string => z.uuid().safeParse(id).success;

/**
 * The writes almost every record has, so a server action is one line: validate the input against its contract, send
 * it to the collection (`POST path`) or to the record (`PATCH path/id`), and revalidate the pages. Server-only on
 * purpose: these take an API path, so only server actions with a fixed path may call them.
 */
export async function saveResource<Data = null>(path: string, id: string | null, input: unknown, contract: z.ZodType, options: Options<Data> = {}): Promise<ApiResult<Data>> {
  const parsed = contract.safeParse(input);
  if (!parsed.success || (id !== null && !validId(id))) return INVALID_INPUT;
  return panelApi<Data>(id ? `${path}/${id}` : path, { method: id ? options.update ?? "PATCH" : "POST", body: parsed.data, permission: options.permission, schema: options.schema, revalidate: true });
}

export async function removeResource(path: string, id: string, permission?: Permission | readonly Permission[], body?: unknown): Promise<ApiResult> {
  if (!validId(id)) return INVALID_INPUT;
  return panelApi(`${path}/${id}`, { method: "DELETE", body, permission, revalidate: true });
}

/** Sends every id of an ordered collection in its new order (`PUT path/order`). */
export async function reorderResource(path: string, ids: unknown, permission?: Permission | readonly Permission[]): Promise<ApiResult> {
  const parsed = z.array(z.uuid()).min(1).max(200).safeParse(ids);
  if (!parsed.success) return INVALID_INPUT;
  return panelApi(`${path}/order`, { method: "PUT", body: { ids: parsed.data }, permission, revalidate: true });
}

/** A record's own action (`POST path/id/action`): publish, activate, a temporary password. */
export async function actOnResource<Data = null>(path: string, id: string, action: string, options: Options<Data> & { body?: unknown; method?: "POST" | "PUT" | "PATCH"; timeoutMs?: number } = {}): Promise<ApiResult<Data>> {
  if (!validId(id)) return INVALID_INPUT;
  return panelApi<Data>(`${path}/${id}/${action}`, { method: options.method ?? "POST", body: options.body, permission: options.permission, schema: options.schema, revalidate: true, timeoutMs: options.timeoutMs });
}
