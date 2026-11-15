import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { hasPermission, requirePermission, type Actor } from '../../common/access/permissions.js';
import { AiUnavailableException, type AiProvider, type ChatTurn } from '../../common/ai/ai-provider.js';
import { AiStylesService, isStyleChoice } from '../../common/ai/ai-styles.service.js';
import { AiService } from '../../common/ai/ai.service.js';
import { ARTICLE_SCHEMA, STRUCTURE_SYSTEM, structurePrompt, writerSystem, type WriterOptions } from '../../common/ai/prompts.js';
import { audit } from '../../common/audit/audit.js';
import { resolveI18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import { CONTENT_LOCALES, isContentLocale } from '../../common/i18n/locales.js';
import { MediaService } from '../newsroom/media.service.js';
import { NewsService } from '../newsroom/news.service.js';
import { TagsService } from '../newsroom/tags.service.js';
import { normalizeProposal, type Proposal } from './proposal.js';

export const BRIEF_MAX = 12_000;
const CONVERSATION_LIMIT = 100;
/** Turns of the conversation sent back to the model besides the new request. */
const HISTORY_TURNS = 8;
const STALE_STREAM_MINUTES = 5;
const TONES = ['neutral', 'explanatory', 'analytical', 'light'] as const;
const LENGTHS = ['short', 'medium', 'long'] as const;

/** `styleId`: the editorial style chosen for the conversation, `none`, or `null` for the newsroom's default at each request. */
export interface WriterSettings extends WriterOptions { image: boolean; styleId: string | null }
const DEFAULT_OPTIONS: WriterSettings = { language: 'pt', tone: 'neutral', length: 'medium', image: true, styleId: null };
/** Request DTOs carry every declared field, the absent ones as `undefined`: only the given values may override. */
const defined = <T extends object>(value: T | undefined): Partial<T> =>
  Object.fromEntries(Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined)) as Partial<T>;

interface ConversationRow {
  id: string; user_id: string; title: string; news_id: string | null; options: Partial<WriterSettings>; created_at: Date; updated_at: Date;
  last_message_at: Date | null; preview?: string | null;
}
interface MessageRow {
  id: string; role: 'user' | 'assistant'; content: string; proposal: Proposal | null; media_ids: string[]; status: 'complete' | 'streaming' | 'stopped' | 'error';
  error_code: string | null; provider: string | null; model: string | null; created_at: Date;
}

/** What the browser hears while an article is written, in order. */
export type WriterEvent =
  | { type: 'user'; message: ReturnType<AiWriterService['messageView']> }
  | { type: 'status'; stage: 'writing' | 'structuring' | 'illustrating' }
  | { type: 'delta'; text: string }
  | { type: 'proposal'; proposal: Proposal }
  | { type: 'image'; media: Awaited<ReturnType<MediaService['describe']>>[number] }
  | { type: 'done'; message: ReturnType<AiWriterService['messageView']>; conversation: ReturnType<AiWriterService['conversationView']> }
  | { type: 'error'; code: string };

export interface WriterContext {
  actor: Actor; provider: AiProvider; conversation: ConversationRow; options: WriterSettings; assistantId: string;
  userMessage: MessageRow; turns: ChatTurn[]; system: string; site: string; guidelines: string; images: boolean;
  categories: Array<{ id: string; slug: string; name: string }>;
}

/**
 * The AI writer: each account's own conversations in which the model writes a news article from the editor's brief,
 * streamed as it is written, then structures it in both languages (title, subtitle, body, SEO, section, tags) and
 * illustrates it with a generated cover. A proposal becomes a draft of the builder in one action. The model receives the
 * brief, the conversation, the portal's sections and style guide — nothing else of the newsroom.
 */
@Injectable()
export class AiWriterService {
  private readonly logger = new Logger(AiWriterService.name);

  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(AiService) private readonly ai: AiService,
    @Inject(AiStylesService) private readonly styles: AiStylesService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(NewsService) private readonly news: NewsService,
    @Inject(TagsService) private readonly tags: TagsService,
  ) {}

  async status(actor: Actor) {
    requirePermission(actor, 'ai:use');
    return this.ai.status();
  }

  /** The editorial styles the writer offers, the default first. */
  async styleChoices(actor: Actor) {
    requirePermission(actor, 'ai:use');
    return this.styles.choices(actor);
  }

  async list(actor: Actor) {
    requirePermission(actor, 'ai:use');
    const rows: ConversationRow[] = await this.database.query(`SELECT c.*, (SELECT m.content FROM public.ai_messages m
        WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY m.created_at DESC LIMIT 1) AS preview
      FROM public.ai_conversations c WHERE c.user_id = $1 ORDER BY coalesce(c.last_message_at, c.created_at) DESC, c.id LIMIT ${CONVERSATION_LIMIT}`, [actor.userId]);
    return rows.map((row) => this.conversationView(row));
  }

  async create(actor: Actor, input: { options?: Partial<WriterSettings>; newsId?: string | null }) {
    requirePermission(actor, 'ai:use');
    const options = this.options(input.options);
    if (input.newsId) await this.news.get(actor, input.newsId);
    const [row]: ConversationRow[] = await this.database.query(`INSERT INTO public.ai_conversations (id, user_id, options, news_id)
      VALUES ($1, $2, $3::jsonb, $4) RETURNING *`, [randomUUID(), actor.userId, JSON.stringify(options), input.newsId ?? null]);
    return this.conversationView(row);
  }

  async get(actor: Actor, id: string) {
    requirePermission(actor, 'ai:use');
    const conversation = await this.conversation(this.database.manager, actor, id);
    await this.database.query(`UPDATE public.ai_messages SET status = 'error', error_code = 'interrupted'
      WHERE conversation_id = $1 AND status = 'streaming' AND created_at < now() - make_interval(mins => ${STALE_STREAM_MINUTES})`, [id]);
    const messages: MessageRow[] = await this.database.query('SELECT * FROM public.ai_messages WHERE conversation_id = $1 ORDER BY created_at, id', [id]);
    const mediaIds = [...new Set(messages.flatMap((message) => message.media_ids))];
    return { ...this.conversationView(conversation), messages: messages.map((message) => this.messageView(message)), media: await this.media.describe(mediaIds) };
  }

  async update(actor: Actor, id: string, input: { title?: string; options?: Partial<WriterSettings> }) {
    requirePermission(actor, 'ai:use');
    return this.database.transaction(async (manager) => {
      const current = await this.conversation(manager, actor, id, true);
      const [[row]]: [ConversationRow[], number] = await manager.query(`UPDATE public.ai_conversations SET title = $2, options = $3::jsonb, updated_at = now()
        WHERE id = $1 RETURNING *`, [id, input.title === undefined ? current.title : input.title.replace(/\s+/g, ' ').trim().slice(0, 160),
        JSON.stringify(input.options ? this.options({ ...current.options, ...defined(input.options) }) : current.options)]);
      return this.conversationView(row);
    });
  }

  async remove(actor: Actor, id: string) {
    requirePermission(actor, 'ai:use');
    const [, removed]: [unknown, number] = await this.database.query('DELETE FROM public.ai_conversations WHERE id = $1 AND user_id = $2', [id, actor.userId]);
    if (!removed) throw new NotFoundException();
  }

  /**
   * Accepts a request and records it. Everything that can still refuse it does so here, as an ordinary HTTP error:
   * the conversation is not the account's, an answer is still being written, or no provider answers (503).
   */
  async prepare(actor: Actor, id: string, input: { content: string; options?: Partial<WriterSettings> }): Promise<WriterContext> {
    requirePermission(actor, 'ai:use');
    const content = input.content.replace(/\r\n?/g, '\n').trim();
    if (!content || content.length > BRIEF_MAX) throw new BadRequestException({ statusCode: 400, message: 'Invalid request', code: 'brief_invalid' });
    const context = await this.ai.context();
    return this.database.transaction(async (manager) => {
      let conversation = await this.conversation(manager, actor, id, true);
      const streaming: unknown[] = await manager.query(`SELECT 1 FROM public.ai_messages WHERE conversation_id = $1 AND status = 'streaming'
        AND created_at >= now() - make_interval(mins => ${STALE_STREAM_MINUTES})`, [id]);
      if (streaming.length) throw new ConflictException({ statusCode: 409, message: 'An answer is still being written', code: 'answer_in_progress' });
      const options = this.options({ ...conversation.options, ...defined(input.options) });
      // The chosen style's instructions, read now: an edit in the settings applies from the next request on.
      const guidelines = await this.styles.instructionsFor(options.styleId);
      const history: MessageRow[] = await manager.query(`SELECT * FROM public.ai_messages WHERE conversation_id = $1 AND status = 'complete'
        ORDER BY created_at DESC, id DESC LIMIT ${HISTORY_TURNS}`, [id]);
      const [userMessage]: MessageRow[] = await manager.query(`INSERT INTO public.ai_messages (id, conversation_id, role, content) VALUES ($1, $2, 'user', $3) RETURNING *`,
        [randomUUID(), id, content]);
      const assistantId = randomUUID();
      await manager.query(`INSERT INTO public.ai_messages (id, conversation_id, role, status, provider, model) VALUES ($1, $2, 'assistant', 'streaming', $3, $4)`,
        [assistantId, id, context.provider.id, context.provider.textModel]);
      const title = conversation.title || content.replace(/\s+/g, ' ').slice(0, 80);
      [[conversation]] = await manager.query(`UPDATE public.ai_conversations SET title = $2, options = $3::jsonb, last_message_at = now(), updated_at = now()
        WHERE id = $1 RETURNING *`, [id, title, JSON.stringify(options)]);
      const categories: Array<{ id: string; slug: { pt: string; en: string }; name: I18nString }> = await manager.query(
        'SELECT id, slug, name FROM public.categories WHERE active ORDER BY position');
      await audit(manager, { actorId: actor.userId, action: 'ai_writer.requested', resourceType: 'ai_conversation', resourceId: id, metadata: { provider: context.provider.id } });
      return {
        actor, provider: context.provider, conversation, options, assistantId, userMessage, site: context.site, guidelines, images: context.images,
        categories: categories.map((category) => ({ id: category.id, slug: category.slug.pt, name: resolveI18nString(category.name, options.language) })),
        system: writerSystem(context.site, options, categories.map((category) => resolveI18nString(category.name, options.language)), guidelines),
        turns: [...history.reverse().map((message): ChatTurn => ({ role: message.role, content: message.content })), { role: 'user', content }],
      };
    });
  }

  /** Writes, structures and illustrates; what was written so far is kept when the editor stops or leaves. */
  async *answer(context: WriterContext, signal: AbortSignal): AsyncGenerator<WriterEvent> {
    yield { type: 'user', message: this.messageView(context.userMessage) };
    yield { type: 'status', stage: 'writing' };
    let article = '';
    try {
      for await (const piece of context.provider.write({ system: context.system, language: context.options.language, turns: context.turns, signal })) {
        article += piece;
        yield { type: 'delta', text: piece };
      }
    } catch (error) {
      const code = error instanceof AiUnavailableException ? error.code : 'ai_provider_failed';
      await this.finish(context, article, null, [], article ? 'stopped' : 'error', code);
      yield { type: 'error', code };
      return;
    }
    if (signal.aborted || !article.trim()) {
      await this.finish(context, article, null, [], 'stopped', null);
      return;
    }
    yield { type: 'status', stage: 'structuring' };
    let proposal: Proposal | null = null;
    let errorCode: string | null = null;
    try {
      const raw = await context.provider.structure({
        system: STRUCTURE_SYSTEM(context.guidelines), prompt: structurePrompt(article, context.categories), schema: ARTICLE_SCHEMA, article,
        signal: AbortSignal.any([signal, AbortSignal.timeout(180_000)]),
      });
      proposal = normalizeProposal(raw, context.categories);
      if (!proposal) errorCode = 'structure_failed';
    } catch {
      errorCode = 'structure_failed';
    }
    if (proposal) yield { type: 'proposal', proposal };
    const mediaIds: string[] = [];
    if (proposal && context.options.image && context.images && proposal.imagePrompt && hasPermission(context.actor, 'media:manage') && !signal.aborted) {
      yield { type: 'status', stage: 'illustrating' };
      try {
        const media = await this.media.generate(context.actor, {
          prompt: proposal.imagePrompt, title: proposal[context.options.language].title.slice(0, 200),
          alt: Object.fromEntries(CONTENT_LOCALES.map((locale) => [locale, proposal![locale].imageCaption.slice(0, 300)])),
          caption: Object.fromEntries(CONTENT_LOCALES.map((locale) => [locale, proposal![locale].imageCaption])),
        });
        mediaIds.push(media.id);
        const [described] = await this.media.describe([media.id]);
        yield { type: 'image', media: described };
      } catch {
        errorCode = 'image_failed';
      }
    }
    const message = await this.finish(context, article, proposal, mediaIds, 'complete', errorCode);
    const [conversation]: ConversationRow[] = await this.database.query('SELECT * FROM public.ai_conversations WHERE id = $1', [context.conversation.id]);
    yield { type: 'done', message: this.messageView(message), conversation: this.conversationView(conversation) };
  }

  private async finish(context: WriterContext, content: string, proposal: Proposal | null, mediaIds: string[], status: MessageRow['status'], errorCode: string | null) {
    const [rows]: [MessageRow[], number] = await this.database.query(`UPDATE public.ai_messages SET content = $2, proposal = $3::jsonb, media_ids = $4,
      status = $5, error_code = $6 WHERE id = $1 RETURNING *`, [context.assistantId, content.slice(0, 60000), proposal ? JSON.stringify(proposal) : null, mediaIds, status, errorCode]);
    await this.database.query('UPDATE public.ai_conversations SET updated_at = now(), last_message_at = now() WHERE id = $1', [context.conversation.id]);
    return rows[0];
  }

  /**
   * Turns a proposal into news content: a new draft (signed by the account, both languages, section, tags and the
   * generated cover), or the conversation's own news item when `target` names it and the account may edit it.
   */
  async apply(actor: Actor, messageId: string, input: { target?: 'new' | 'linked'; mediaId?: string | null }) {
    requirePermission(actor, 'ai:use');
    return this.database.transaction(async (manager) => {
      const [row]: Array<MessageRow & { conversation_id: string; user_id: string; news_id: string | null }> = await manager.query(`SELECT m.*, c.user_id, c.news_id
        FROM public.ai_messages m JOIN public.ai_conversations c ON c.id = m.conversation_id WHERE m.id = $1 FOR UPDATE OF m`, [messageId]);
      if (!row || row.user_id !== actor.userId) throw new NotFoundException();
      if (!row.proposal) throw new ConflictException({ statusCode: 409, message: 'The answer has no proposal', code: 'proposal_missing' });
      const proposal = row.proposal;
      const cover = input.mediaId === undefined ? row.media_ids[0] ?? null : input.mediaId;
      if (cover && !row.media_ids.includes(cover)) {
        const [exists]: unknown[] = await manager.query('SELECT 1 FROM public.media WHERE id = $1', [cover]);
        if (!exists) throw new BadRequestException({ statusCode: 400, message: 'Unknown image', code: 'media_not_found' });
      }
      const tagIds = hasPermission(actor, 'taxonomy:manage') || hasPermission(actor, 'news:write') ? await this.tags.ensure(manager, proposal.tags) : [];
      const [conversation]: Array<{ options: Partial<WriterSettings> }> = await manager.query('SELECT options FROM public.ai_conversations WHERE id = $1', [row.conversation_id]);
      const source = this.options(conversation?.options).language;
      const content = {
        title: { pt: proposal.pt.title, en: proposal.en.title }, subtitle: { pt: proposal.pt.subtitle, en: proposal.en.subtitle },
        body: { pt: proposal.pt.body, en: proposal.en.body }, seoTitle: { pt: proposal.pt.seoTitle, en: proposal.en.seoTitle },
        seoDescription: { pt: proposal.pt.seoDescription, en: proposal.en.seoDescription },
        coverCaption: cover ? { pt: proposal.pt.imageCaption, en: proposal.en.imageCaption } : undefined,
        coverMediaId: cover ?? undefined, categoryId: proposal.categoryId ?? undefined, tagIds,
        locales: CONTENT_LOCALES.filter((locale) => proposal[locale].title && proposal[locale].body), aiAssisted: true,
        translation: { enabled: true, source },
      };
      let newsId: string;
      if (input.target === 'linked' && row.news_id) {
        const updated = await this.news.update(actor, row.news_id, content);
        newsId = updated.id;
      } else {
        if (!hasPermission(actor, 'news:write')) throw new ForbiddenException();
        newsId = (await this.news.create(actor, content, manager)).id;
        await manager.query('UPDATE public.ai_conversations SET news_id = $2, updated_at = now() WHERE id = $1', [row.conversation_id, newsId]);
      }
      await manager.query('UPDATE public.ai_messages SET proposal = $2::jsonb WHERE id = $1', [messageId, JSON.stringify({ ...proposal, newsId })]);
      await audit(manager, { actorId: actor.userId, action: 'ai_writer.applied', resourceType: 'news', resourceId: newsId, metadata: { messageId } });
      return { newsId };
    });
  }

  /** Another cover for a proposal, kept beside the first ones so the editor can choose. */
  async illustrate(actor: Actor, messageId: string, input: { prompt?: string }) {
    requirePermission(actor, 'ai:use');
    requirePermission(actor, 'media:manage');
    const [row]: Array<MessageRow & { user_id: string }> = await this.database.query(`SELECT m.*, c.user_id FROM public.ai_messages m
      JOIN public.ai_conversations c ON c.id = m.conversation_id WHERE m.id = $1`, [messageId]);
    if (!row || row.user_id !== actor.userId) throw new NotFoundException();
    if (!row.proposal) throw new ConflictException({ statusCode: 409, message: 'The answer has no proposal', code: 'proposal_missing' });
    const prompt = (input.prompt?.trim() || row.proposal.imagePrompt).slice(0, 1000);
    const media = await this.media.generate(actor, {
      prompt, title: row.proposal.pt.title.slice(0, 200),
      alt: { pt: row.proposal.pt.imageCaption.slice(0, 300), en: row.proposal.en.imageCaption.slice(0, 300) },
      caption: { pt: row.proposal.pt.imageCaption, en: row.proposal.en.imageCaption },
    });
    await this.database.query('UPDATE public.ai_messages SET media_ids = array_append(media_ids, $2) WHERE id = $1', [messageId, media.id]);
    return media;
  }

  private options(input: Partial<WriterSettings> | undefined): WriterSettings {
    const value = { ...DEFAULT_OPTIONS, ...defined(input) } as WriterSettings;
    if (!isContentLocale(value.language) || !(TONES as readonly string[]).includes(value.tone) || !(LENGTHS as readonly string[]).includes(value.length)
      || typeof value.image !== 'boolean' || !isStyleChoice(value.styleId)) {
      throw new BadRequestException({ statusCode: 400, message: 'Invalid options', code: 'writer_options_invalid' });
    }
    return { language: value.language, tone: value.tone, length: value.length, image: value.image, styleId: value.styleId };
  }

  private async conversation(manager: EntityManager, actor: Actor, id: string, lock = false): Promise<ConversationRow> {
    const [row]: ConversationRow[] = await manager.query(`SELECT * FROM public.ai_conversations WHERE id = $1 AND user_id = $2 ${lock ? 'FOR UPDATE' : ''}`, [id, actor.userId]);
    if (!row) throw new NotFoundException();
    return row;
  }

  messageView(row: MessageRow) {
    return {
      id: row.id, role: row.role, content: row.content, proposal: row.proposal, mediaIds: row.media_ids, status: row.status, errorCode: row.error_code,
      provider: row.provider, model: row.model, createdAt: row.created_at.toISOString(),
    };
  }

  conversationView(row: ConversationRow) {
    return {
      id: row.id, title: row.title, newsId: row.news_id, options: this.options(row.options), createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(), lastMessageAt: row.last_message_at?.toISOString() ?? null,
      ...(row.preview !== undefined ? { preview: row.preview?.slice(0, 160) ?? null } : {}),
    };
  }
}
