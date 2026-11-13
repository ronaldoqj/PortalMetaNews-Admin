"use server";

import { z } from "zod";
import { panelApi } from "./api-call";
import { INVALID_INPUT, type ApiResult } from "./api-result";
import type { TemporaryCredentials } from "./contracts";
import { removeResource, saveResource } from "./resource";
import {
  createdUserSchema, createUserSchema, profileSchema, roleSchema, saveRoleSchema, teamUserSchema, temporaryPasswordSchema, updateUserSchema,
} from "./team-contracts";

const validId = (id: unknown): id is string => z.uuid().safeParse(id).success;

/** Creates a custom role, or saves an existing one (`PUT`, as the API takes the whole role). */
export async function saveRole(input: unknown, id?: string): Promise<ApiResult> {
  const result = await saveResource("panel/team/roles", id ?? null, input, saveRoleSchema, { permission: "users:manage", update: "PUT", schema: roleSchema });
  return result.ok ? { ok: true, data: null } : result;
}

export async function deleteRole(id: string): Promise<ApiResult> {
  return removeResource("panel/team/roles", id, "users:manage");
}

/** A new account with a temporary password, returned once for manual hand-over. */
export async function createUser(input: unknown): Promise<ApiResult<{ id: string; credentials: TemporaryCredentials }>> {
  const result = await saveResource("panel/team/users", null, input, createUserSchema, { permission: "users:manage", schema: createdUserSchema });
  if (!result.ok) return result;
  return { ok: true, data: { id: result.data.id, credentials: { email: result.data.email, temporaryPassword: result.data.temporaryPassword, delivery: "manual" } } };
}

export async function updateUser(id: string, input: unknown): Promise<ApiResult> {
  const result = await saveResource("panel/team/users", id, input, updateUserSchema, { permission: "users:manage", schema: teamUserSchema });
  return result.ok ? { ok: true, data: null } : result;
}

/** Replaces another account's password with a temporary one, shown once; its sessions end. */
export async function issueTemporaryPassword(id: string): Promise<ApiResult<{ credentials: TemporaryCredentials }>> {
  if (!validId(id)) return INVALID_INPUT;
  const result = await panelApi(`panel/team/users/${id}/temporary-password`, { method: "POST", permission: "users:manage", schema: temporaryPasswordSchema, revalidate: true });
  return result.ok ? { ok: true, data: { credentials: { ...result.data, delivery: "manual" } } } : result;
}

/** Removes another account's photo; the initials show again. */
export async function removeUserAvatar(id: string): Promise<ApiResult> {
  if (!validId(id)) return INVALID_INPUT;
  return panelApi(`panel/team/users/${id}/avatar`, { method: "DELETE", permission: "users:manage", revalidate: true });
}

/** The signed-in account's own name and author profile. */
export async function updateProfile(input: unknown): Promise<ApiResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  const result = await panelApi("panel/profile", { method: "PATCH", body: parsed.data, schema: teamUserSchema, revalidate: true });
  return result.ok ? { ok: true, data: null } : result;
}

export async function removeOwnAvatar(): Promise<ApiResult> {
  return panelApi("panel/profile/avatar", { method: "DELETE", revalidate: true });
}
