import { HttpException } from '@nestjs/common';
import type { ContentLocale } from '../i18n/locales.js';

export type AiProviderId = 'gemini' | 'local';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** One field to translate: plain text, or article HTML whose tags and attributes must come back untouched. */
export interface TranslationField {
  text: string;
  format: 'plain' | 'html';
}

export interface TranslateInput {
  from: ContentLocale;
  to: ContentLocale;
  fields: Readonly<Record<string, TranslationField>>;
  /** The newsroom's style guide, from the panel's AI settings. */
  guidelines: string;
  signal?: AbortSignal;
}

export interface WriteInput {
  /** What the writer is and how it must answer. */
  system: string;
  /** The language the article is written in (the local provider writes from it). */
  language: ContentLocale;
  /** The conversation so far, ending with the newest request. */
  turns: readonly ChatTurn[];
  signal?: AbortSignal;
}

export interface StructureInput {
  system: string;
  prompt: string;
  /** JSON Schema of the answer. */
  schema: Record<string, unknown>;
  /** The article as streamed, for the local provider, which has no model to ask. */
  article: string;
  signal?: AbortSignal;
}

export interface ImageInput {
  prompt: string;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  data: Buffer;
  mimeType: string;
}

/**
 * A model provider. Providers are interchangeable behind this contract: Gemini when a key exists, the local one
 * (offline, deterministic) otherwise in development. Nothing a provider receives or answers is ever logged.
 */
export interface AiProvider {
  readonly id: AiProviderId;
  readonly textModel: string;
  readonly imageModel: string | null;
  /** Whether text is written by a generative model (false: the local simulation). */
  readonly generative: boolean;
  /** Translates every field, keys preserved. */
  translate(input: TranslateInput): Promise<Record<string, string>>;
  /** The writer's answer as it is written, piece by piece. */
  write(input: WriteInput): AsyncIterable<string>;
  /** A JSON answer matching `schema`. */
  structure(input: StructureInput): Promise<unknown>;
  /** One image for the prompt. */
  image(input: ImageInput): Promise<GeneratedImage>;
}

export type AiUnavailableCode = 'ai_disabled' | 'ai_unconfigured' | 'ai_provider_failed' | 'ai_key_rejected' | 'ai_images_unavailable';

/** HTTP 503 with a code the panel recognises, so it says why the AI cannot answer and where to fix it. */
export class AiUnavailableException extends HttpException {
  constructor(readonly code: AiUnavailableCode) {
    super({ statusCode: 503, message: 'The AI provider is unavailable', code }, 503);
  }
}
