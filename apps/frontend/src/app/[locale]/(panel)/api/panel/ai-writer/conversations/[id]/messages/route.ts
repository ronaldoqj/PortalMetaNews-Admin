import type { NextRequest } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/components/admin/permissions";
import { forwardEventStream, panelSessionHeaders, relayFailure, sameOrigin, validLocale } from "@/components/shared/file-relay";

const askSchema = z.object({
  content: z.string().trim().min(1).max(12_000),
  options: z.object({
    language: z.enum(["pt", "en"]).optional(), tone: z.enum(["neutral", "explanatory", "analytical", "light"]).optional(),
    length: z.enum(["short", "medium", "long"]).optional(), image: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/** Sends a brief to the AI writer and relays its answer as server-sent events, without buffering. */
export async function POST(request: NextRequest, { params }: RouteContext<"/[locale]/api/panel/ai-writer/conversations/[id]/messages">) {
  const { locale, id } = await params;
  if (!validLocale(locale) || !z.uuid().safeParse(id).success) return relayFailure("notFound", 404);
  if (!sameOrigin(request)) return relayFailure("forbidden", 403);
  const body = askSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return relayFailure("invalidInput", 400);
  const headers = await panelSessionHeaders(request, (actor) => hasPermission(actor, "ai:use"));
  if (headers instanceof Response) return headers;
  return forwardEventStream(request, `panel/ai-writer/conversations/${id}/messages`, headers, body.data);
}
