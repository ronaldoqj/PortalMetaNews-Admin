import type { GoogleGenAI } from '@google/genai';
import {
  AiUnavailableException, type AiProvider, type GeneratedImage, type ImageInput, type StructureInput, type TranslateInput, type WriteInput,
} from './ai-provider.js';
import { translationPrompt, TRANSLATION_SYSTEM } from './prompts.js';

export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export type GeminiClientFactory = (apiKey: string) => GoogleGenAI;
export const GEMINI_CLIENT_FACTORY = Symbol('GEMINI_CLIENT_FACTORY');

/** A refused key is the operator's to fix; anything else is the provider's own trouble. Nothing of the answer is kept. */
function failure(error: unknown): AiUnavailableException {
  if (error instanceof AiUnavailableException) return error;
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: unknown })?.message ?? '');
  const rejected = (status === 400 && /api key/i.test(message)) || status === 401 || status === 403;
  return new AiUnavailableException(rejected ? 'ai_key_rejected' : 'ai_provider_failed');
}

const aborted = (error: unknown, signal?: AbortSignal) => signal?.aborted === true || (error as { name?: string })?.name === 'AbortError';

/** Google Gemini through the Gen AI SDK: a text model for translation and writing, an image model for covers. */
export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;
  readonly generative = true;

  constructor(
    private readonly client: GoogleGenAI,
    readonly textModel: string = DEFAULT_GEMINI_TEXT_MODEL,
    readonly imageModel: string | null = DEFAULT_GEMINI_IMAGE_MODEL,
  ) {}

  async translate(input: TranslateInput): Promise<Record<string, string>> {
    const keys = Object.keys(input.fields);
    if (!keys.length) return {};
    const answer = await this.json(TRANSLATION_SYSTEM(input.guidelines), translationPrompt(input), {
      type: 'object', properties: Object.fromEntries(keys.map((key) => [key, { type: 'string' }])), required: keys,
    }, input.signal, 0.2);
    const result: Record<string, string> = {};
    for (const key of keys) {
      const value = (answer as Record<string, unknown>)?.[key];
      if (typeof value !== 'string') throw new AiUnavailableException('ai_provider_failed');
      result[key] = value;
    }
    return result;
  }

  async *write(input: WriteInput): AsyncIterable<string> {
    let response;
    try {
      response = await this.client.models.generateContentStream({
        model: this.textModel,
        contents: input.turns.map((turn) => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.content }] })),
        config: { systemInstruction: input.system, temperature: 0.6, abortSignal: input.signal },
      });
    } catch (error) {
      if (aborted(error, input.signal)) return;
      throw failure(error);
    }
    try {
      for await (const chunk of response) {
        if (input.signal?.aborted) return;
        if (chunk.text) yield chunk.text;
      }
    } catch (error) {
      if (aborted(error, input.signal)) return;
      throw failure(error);
    }
  }

  structure(input: StructureInput): Promise<unknown> {
    return this.json(input.system, input.prompt, input.schema, input.signal, 0.3);
  }

  async image(input: ImageInput): Promise<GeneratedImage> {
    if (!this.imageModel) throw new AiUnavailableException('ai_images_unavailable');
    try {
      if (this.imageModel.startsWith('imagen')) {
        const response = await this.client.models.generateImages({
          model: this.imageModel, prompt: input.prompt, config: { numberOfImages: 1, aspectRatio: '16:9', abortSignal: input.signal },
        });
        const bytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!bytes) throw new AiUnavailableException('ai_provider_failed');
        return { data: Buffer.from(bytes, 'base64'), mimeType: response.generatedImages?.[0]?.image?.mimeType ?? 'image/png' };
      }
      const response = await this.client.models.generateContent({
        model: this.imageModel, contents: input.prompt,
        config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' }, abortSignal: input.signal },
      });
      const part = response.candidates?.[0]?.content?.parts?.find((candidate) => candidate.inlineData?.data);
      if (!part?.inlineData?.data) throw new AiUnavailableException('ai_provider_failed');
      return { data: Buffer.from(part.inlineData.data, 'base64'), mimeType: part.inlineData.mimeType ?? 'image/png' };
    } catch (error) {
      throw failure(error);
    }
  }

  private async json(system: string, prompt: string, schema: Record<string, unknown>, signal: AbortSignal | undefined, temperature: number): Promise<unknown> {
    try {
      const response = await this.client.models.generateContent({
        model: this.textModel, contents: prompt,
        config: { systemInstruction: system, temperature, responseMimeType: 'application/json', responseJsonSchema: schema, abortSignal: signal },
      });
      return JSON.parse(response.text ?? '');
    } catch (error) {
      throw failure(error);
    }
  }
}
