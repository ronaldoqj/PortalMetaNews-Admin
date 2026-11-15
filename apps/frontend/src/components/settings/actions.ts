"use server";

import { panelApi } from "../admin/api-call";
import { INVALID_INPUT, type ApiResult } from "../admin/api-result";
import { removeResource, saveResource } from "../admin/resource";
import {
  aiSettingsSchema, aiStyleInputSchema, aiStyleSchema, aiTestSchema, emailSettingsSchema, emailTestSchema, saveAiSettingsSchema, saveEmailSettingsSchema,
  type AiStyle, type AiTest, type EmailTest,
} from "./contracts";

const SLOW = 60_000;

export async function saveAiSettings(input: unknown): Promise<ApiResult> {
  const parsed = saveAiSettingsSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  const result = await panelApi("panel/settings/ai", { method: "PUT", body: parsed.data, permission: "settings:manage", schema: aiSettingsSchema, revalidate: true });
  return result.ok ? { ok: true, data: null } : result;
}

export async function saveAiStyle(id: string | null, values: unknown): Promise<ApiResult<AiStyle>> {
  return saveResource("panel/settings/ai/styles", id, values, aiStyleInputSchema, { permission: "settings:manage", schema: aiStyleSchema });
}

/** Makes a style the default: the one the AI uses wherever no one chooses another. */
export async function makeAiStyleDefault(id: string): Promise<ApiResult<AiStyle>> {
  return saveResource("panel/settings/ai/styles", id, { isDefault: true }, aiStyleInputSchema.pick({ isDefault: true }), { permission: "settings:manage", schema: aiStyleSchema });
}

export async function removeAiStyle(id: string): Promise<ApiResult> {
  return removeResource("panel/settings/ai/styles", id, "settings:manage");
}

/** A one-word translation through the saved configuration: proves the key and the model. */
export async function testAi(): Promise<ApiResult<AiTest>> {
  return panelApi("panel/settings/ai/test", { method: "POST", permission: "settings:manage", schema: aiTestSchema, timeoutMs: SLOW });
}

export async function saveEmailSettings(input: unknown): Promise<ApiResult> {
  const parsed = saveEmailSettingsSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  const body = { ...parsed.data, fromEmail: parsed.data.fromEmail || null };
  const result = await panelApi("panel/settings/email", { method: "PUT", body, permission: "settings:manage", schema: emailSettingsSchema, revalidate: true });
  return result.ok ? { ok: true, data: null } : result;
}

/** Connects with the saved relay and sends a test message to the signed-in account. */
export async function testEmail(): Promise<ApiResult<EmailTest>> {
  return panelApi("panel/settings/email/test", { method: "POST", permission: "settings:manage", schema: emailTestSchema, timeoutMs: SLOW });
}
