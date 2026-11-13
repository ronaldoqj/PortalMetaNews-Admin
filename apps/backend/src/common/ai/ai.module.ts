import { Global, Module } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AiService } from './ai.service.js';
import { GEMINI_CLIENT_FACTORY, type GeminiClientFactory } from './gemini-provider.js';

/** Model providers. The Gemini client is created per use from the key that applies now, never once for the process. */
@Global()
@Module({
  providers: [
    { provide: GEMINI_CLIENT_FACTORY, useValue: ((apiKey: string) => new GoogleGenAI({ apiKey })) satisfies GeminiClientFactory },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
