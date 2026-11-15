import { z } from "zod";
import { i18nStringSchema } from "../../i18n/i18n-string";

/** Mirrors the API's limits and choices (`modules/ai-writer`). */
export const BRIEF_MAX = 12_000;
export const WRITER_LANGUAGES = ["pt", "en"] as const;
export const WRITER_TONES = ["neutral", "explanatory", "analytical", "light"] as const;
export const WRITER_LENGTHS = ["short", "medium", "long"] as const;

/** No editorial style for the conversation; `null` follows the newsroom's default. */
export const NO_STYLE = "none";
const styleChoiceSchema = z.union([z.uuid(), z.literal(NO_STYLE)]).nullable();

export const writerOptionsSchema = z.object({
  language: z.enum(WRITER_LANGUAGES), tone: z.enum(WRITER_TONES), length: z.enum(WRITER_LENGTHS), image: z.boolean(),
  /** The editorial style chosen for the conversation, `none`, or `null` for the newsroom's default. */
  styleId: styleChoiceSchema,
}).strict();
export type WriterOptions = z.infer<typeof writerOptionsSchema>;
export const DEFAULT_OPTIONS: WriterOptions = { language: "pt", tone: "neutral", length: "medium", image: true, styleId: null };

/** An editorial style the writer offers (`panel/ai-writer/styles`), the default first. */
export const writerStyleSchema = z.object({ id: z.uuid(), name: z.string(), isDefault: z.boolean() }).strict();
export type WriterStyle = z.infer<typeof writerStyleSchema>;

/**
 * The style a conversation's choice shows as: the chosen one, the default for `null` or for a style removed since it
 * was chosen (as the API resolves it), `none` when there is no default either.
 */
export function chosenStyle(styles: readonly WriterStyle[], styleId: string | null): string {
  if (styleId === NO_STYLE) return NO_STYLE;
  return styles.find((style) => style.id === styleId)?.id ?? styles.find((style) => style.isDefault)?.id ?? NO_STYLE;
}


/** What answers now (`panel/ai-writer/status`): never a key. */
export const aiStatusSchema = z.object({
  available: z.boolean(), provider: z.enum(["gemini", "local"]).nullable(), generative: z.boolean(), textModel: z.string().nullable(),
  imageModel: z.string().nullable(), images: z.boolean(), code: z.string().optional(),
}).strict();
export type AiStatus = z.infer<typeof aiStatusSchema>;

const versionSchema = z.object({
  title: z.string(), subtitle: z.string(), body: z.string(), seoTitle: z.string(), seoDescription: z.string(), imageCaption: z.string(),
}).strict();
export type ProposalVersion = z.infer<typeof versionSchema>;

/** The structured article an answer proposes, in both languages (`Proposal` in the API). */
export const proposalSchema = z.object({
  pt: versionSchema, en: versionSchema, categoryId: z.uuid().nullable(), tags: z.array(i18nStringSchema({ maxLength: 60, required: false })),
  imagePrompt: z.string(), newsId: z.uuid().optional(),
}).strict();
export type Proposal = z.infer<typeof proposalSchema>;

/** An image of the media library as the writer shows it (cover options of a proposal). Extra fields are ignored. */
export const writerMediaSchema = z.object({
  id: z.uuid(), source: z.enum(["upload", "ai"]), width: z.number().int().positive(), height: z.number().int().positive(), color: z.string(),
  alt: i18nStringSchema({ maxLength: 300, required: false }), caption: i18nStringSchema({ maxLength: 500, required: false }), credit: z.string(),
});
export type WriterMedia = z.infer<typeof writerMediaSchema>;

export const messageSchema = z.object({
  id: z.uuid(), role: z.enum(["user", "assistant"]), content: z.string(), proposal: proposalSchema.nullable(), mediaIds: z.array(z.uuid()),
  status: z.enum(["complete", "streaming", "stopped", "error"]), errorCode: z.string().nullable(), provider: z.string().nullable(),
  model: z.string().nullable(), createdAt: z.iso.datetime({ offset: true }),
}).strict();
export type WriterMessage = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.uuid(), title: z.string(), newsId: z.uuid().nullable(), options: writerOptionsSchema, createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }), lastMessageAt: z.iso.datetime({ offset: true }).nullable(), preview: z.string().nullable().optional(),
}).strict();
export type Conversation = z.infer<typeof conversationSchema>;

export const conversationDetailSchema = conversationSchema.extend({ messages: z.array(messageSchema), media: z.array(writerMediaSchema) }).strict();
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const applyResultSchema = z.object({ newsId: z.uuid() }).strict();

/** What the browser hears while an article is written, in order (`WriterEvent` in the API). */
export const writerEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), message: messageSchema }),
  z.object({ type: z.literal("status"), stage: z.enum(["writing", "structuring", "illustrating"]) }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("proposal"), proposal: proposalSchema }),
  z.object({ type: z.literal("image"), media: writerMediaSchema }),
  z.object({ type: z.literal("done"), message: messageSchema, conversation: conversationSchema }),
  z.object({ type: z.literal("error"), code: z.string() }),
]);
export type WriterEvent = z.infer<typeof writerEventSchema>;
export type WriterStage = Extract<WriterEvent, { type: "status" }>["stage"];

/** A section of the portal, by id, as the proposal card names it. */
export type SectionNames = Record<string, { pt?: string; en?: string }>;
