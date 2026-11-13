"use server";

import { z } from "zod";
import { panelApi } from "../admin/api-call";
import { INVALID_INPUT, type ApiResult } from "../admin/api-result";
import { actOnResource, removeResource, saveResource } from "../admin/resource";
import { SLOW_API_TIMEOUT_MS } from "../admin/server";
import {
  applyResultSchema, conversationDetailSchema, conversationSchema, writerMediaSchema, writerOptionsSchema,
  type Conversation, type ConversationDetail, type WriterMedia,
} from "./contracts";

const CONVERSATIONS = "panel/ai-writer/conversations";
const MESSAGES = "panel/ai-writer/messages";
const id = z.uuid();

/** A new conversation, optionally linked to a news item the account may read. */
export async function createConversation(input: unknown): Promise<ApiResult<Conversation>> {
  return saveResource(CONVERSATIONS, null, input, z.object({ options: writerOptionsSchema.optional(), newsId: z.uuid().nullable().optional() }).strict(),
    { permission: "ai:use", schema: conversationSchema });
}

export async function loadConversation(conversationId: string): Promise<ApiResult<ConversationDetail>> {
  return id.safeParse(conversationId).success ? panelApi(`${CONVERSATIONS}/${conversationId}`, { permission: "ai:use", schema: conversationDetailSchema }) : INVALID_INPUT;
}

export async function renameConversation(conversationId: string, input: unknown): Promise<ApiResult<Conversation>> {
  return saveResource(CONVERSATIONS, conversationId, input, z.object({ title: z.string().trim().min(1).max(160) }).strict(), { permission: "ai:use", schema: conversationSchema });
}

export async function removeConversation(conversationId: string): Promise<ApiResult> {
  return removeResource(CONVERSATIONS, conversationId, "ai:use");
}

/** Turns a proposal into a draft of the builder (`new`) or applies it to the conversation's linked item (`linked`). */
export async function applyProposal(messageId: string, input: unknown): Promise<ApiResult<{ newsId: string }>> {
  const parsed = z.object({ target: z.enum(["new", "linked"]), mediaId: z.uuid().nullable() }).strict().safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return actOnResource(MESSAGES, messageId, "apply", { body: parsed.data, permission: "ai:use", schema: applyResultSchema });
}

/** Another cover for a proposal; waits for the image model, so up to two and a half minutes. */
export async function illustrateProposal(messageId: string, input: unknown): Promise<ApiResult<WriterMedia>> {
  const parsed = z.object({ prompt: z.string().trim().max(1000).optional() }).strict().safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  return actOnResource(MESSAGES, messageId, "illustrate", {
    body: parsed.data.prompt ? { prompt: parsed.data.prompt } : {}, permission: ["ai:use"], schema: writerMediaSchema, timeoutMs: SLOW_API_TIMEOUT_MS,
  });
}
