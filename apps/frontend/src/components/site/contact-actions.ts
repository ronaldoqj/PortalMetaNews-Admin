"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { adminApi, AdminApiError } from "../admin/server";
import { INVALID_INPUT, type ApiResult } from "../admin/api-result";
import { CONTACT_TOPICS } from "./contracts";

/**
 * The site's contact form, posted to the API from this server (the reader's browser never calls the API). The message
 * is rich text in the platform grammar, which the API parses strictly; the honeypot `website` goes along so the API
 * refuses what only a robot fills. Nothing about the reader's request is forwarded: only what they typed.
 */
export async function sendContact(input: unknown): Promise<ApiResult> {
  const parsed = z.object({
    name: z.string().trim().min(1).max(160), email: z.email().max(254), topic: z.enum(CONTACT_TOPICS),
    message: z.string().trim().min(1).max(100_000), website: z.string().max(200),
  }).safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  const locale = (await getLocale()) === "en" ? "en" : "pt";
  try {
    await adminApi("public/contact", undefined, "POST", { ...parsed.data, locale });
    return { ok: true, data: null };
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return { ok: false, error: status === 429 ? "rateLimited" : status === 400 ? "invalidInput" : "unavailable" };
  }
}
