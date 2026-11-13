import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import type { TranslationField } from '../../common/ai/ai-provider.js';
import { AiService } from '../../common/ai/ai.service.js';
import type { ContentLocale } from '../../common/i18n/locales.js';
import { canonicalArticleHtml, lenientArticleHtml } from '../../common/rich-text/article-html.js';

/** Fields one request may carry, and their combined size: a whole article with its SEO and captions fits. */
export const TRANSLATION_MAX_FIELDS = 24;
export const TRANSLATION_MAX_CHARACTERS = 120_000;
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;

/**
 * Machine translation for the builder's language sync and every bilingual field of the panel (names, captions, alt
 * texts). Article HTML is sent as is and comes back through the lenient parser, so whatever the model returns, only the
 * article grammar is stored; plain text is trimmed. Nothing is stored here: the builder saves what it accepts.
 */
@Injectable()
export class TranslationService {
  constructor(@Inject(AiService) private readonly ai: AiService) {}

  async translate(actor: Actor, input: { from: ContentLocale; to: ContentLocale; fields: Record<string, TranslationField> }) {
    requirePermission(actor, 'ai:use');
    const entries = Object.entries(input.fields ?? {});
    if (input.from === input.to || entries.length > TRANSLATION_MAX_FIELDS || !entries.every(([key, field]) => FIELD_KEY.test(key)
      && field && typeof field.text === 'string' && (field.format === 'plain' || field.format === 'html'))) {
      throw new BadRequestException({ statusCode: 400, message: 'Invalid translation request', code: 'translation_invalid' });
    }
    if (entries.reduce((sum, [, field]) => sum + field.text.length, 0) > TRANSLATION_MAX_CHARACTERS) {
      throw new BadRequestException({ statusCode: 400, message: 'Too much text at once', code: 'translation_too_long' });
    }
    // Empty fields need no model; HTML is canonicalized first so the model sees the stored form.
    const fields: Record<string, TranslationField> = {};
    const result: Record<string, string> = {};
    for (const [key, field] of entries) {
      const text = field.format === 'html' ? canonicalArticleHtml(field.text)?.html ?? lenientArticleHtml(field.text) : field.text.trim();
      if (!text) result[key] = '';
      else fields[key] = { text, format: field.format };
    }
    const context = await this.ai.context();
    if (Object.keys(fields).length) {
      const translated = await context.provider.translate({
        from: input.from, to: input.to, fields, guidelines: context.guidelines, signal: AbortSignal.timeout(120_000),
      });
      for (const [key, field] of Object.entries(fields)) {
        const value = translated[key] ?? '';
        result[key] = field.format === 'html' ? lenientArticleHtml(value) : value.replace(/\s+/g, ' ').trim();
      }
    }
    return { fields: result, provider: context.provider.id, simulated: !context.provider.generative };
  }
}
