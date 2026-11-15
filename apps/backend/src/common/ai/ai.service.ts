import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { requirePermission, type Actor } from '../access/permissions.js';
import { audit } from '../audit/audit.js';
import { SecretCipher } from '../secrets/secret-cipher.service.js';
import { AiUnavailableException, type AiProvider, type AiUnavailableCode } from './ai-provider.js';
import {
  DEFAULT_GEMINI_IMAGE_MODEL, DEFAULT_GEMINI_TEXT_MODEL, GEMINI_CLIENT_FACTORY, GeminiProvider, type GeminiClientFactory,
} from './gemini-provider.js';
import { AiStylesService } from './ai-styles.service.js';
import { LocalProvider } from './local-provider.js';

/** Gemini when a key exists and the local provider otherwise (`auto`), or one of them, or off. */
export const AI_PROVIDERS = ['auto', 'gemini', 'local', 'disabled'] as const;
export type AiProviderSetting = typeof AI_PROVIDERS[number];
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const OWNER = 'site';

interface SettingsRow {
  site_name: string; ai_provider: AiProviderSetting; ai_api_key_encrypted: string | null; ai_text_model: string | null; ai_image_model: string | null;
  ai_images: boolean;
}

/** What answers now, or why nothing does. Never carries a key. */
export interface EffectiveAi {
  available: boolean;
  provider: 'gemini' | 'local' | null;
  generative: boolean;
  textModel: string | null;
  imageModel: string | null;
  images: boolean;
  code?: AiUnavailableCode;
}

export interface AiSettingsUpdate {
  provider: AiProviderSetting;
  /** Write-only: omitted keeps the stored key, an empty string removes it. */
  apiKey?: string;
  textModel?: string | null;
  imageModel?: string | null;
  images?: boolean;
}

export interface AiContext {
  provider: AiProvider;
  site: string;
  /** The default editorial style's instructions (`AiStylesService`), or none. */
  guidelines: string;
  /** Whether covers may be generated (the panel's switch and the provider's image model). */
  images: boolean;
}

/**
 * Decides which model provider answers for the portal and keeps its configuration (`settings:manage`). The key is
 * stored only as ciphertext (`SecretCipher`), is write-only for every interface and never reaches a log.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(SecretCipher) private readonly cipher: SecretCipher,
    @Inject(GEMINI_CLIENT_FACTORY) private readonly createClient: GeminiClientFactory,
    @Inject(AiStylesService) private readonly styles: AiStylesService,
  ) {}

  /** The provider and the newsroom's default style; 503 with the reason when no provider answers. */
  async context(): Promise<AiContext> {
    const row = await this.row();
    const resolved = this.resolve(row);
    if (!resolved.provider) throw new AiUnavailableException(resolved.code);
    return {
      provider: resolved.provider, site: row.site_name, guidelines: await this.styles.defaultInstructions(),
      images: row.ai_images && resolved.provider.imageModel !== null,
    };
  }

  /** What any account of the panel may know: whether the AI answers, and with what kind of provider. */
  async status(): Promise<EffectiveAi> {
    const row = await this.row();
    return this.effective(this.resolve(row), row);
  }

  async settings(actor: Actor) {
    requirePermission(actor, 'settings:manage');
    return this.view(await this.row());
  }

  async updateSettings(actor: Actor, input: AiSettingsUpdate) {
    requirePermission(actor, 'settings:manage');
    return this.database.transaction(async (manager) => {
      const [current]: SettingsRow[] = await manager.query('SELECT ai_provider, ai_api_key_encrypted, ai_text_model, ai_image_model, ai_images FROM public.settings WHERE singleton FOR UPDATE');
      const key = this.nextKey(input.apiKey, current.ai_api_key_encrypted);
      if (input.provider === 'gemini' && !key && !this.environmentKey) {
        throw new BadRequestException({ statusCode: 400, message: 'An API key is required', code: 'ai_key_required' });
      }
      await manager.query(`UPDATE public.settings SET ai_provider = $1, ai_api_key_encrypted = $2, ai_text_model = $3, ai_image_model = $4,
        ai_images = $5, updated_at = now(), updated_by = $6 WHERE singleton`,
      [input.provider, key, this.model(input.textModel, current.ai_text_model), this.model(input.imageModel, current.ai_image_model),
        input.images ?? current.ai_images, actor.userId]);
      // The decision only: never the key or a model name.
      await audit(manager, { actorId: actor.userId, action: 'settings.ai_updated', metadata: { provider: input.provider, ownKey: key !== null } });
      const [row]: SettingsRow[] = await manager.query(`SELECT site_name, ai_provider, ai_api_key_encrypted, ai_text_model, ai_image_model, ai_images
        FROM public.settings WHERE singleton`);
      return this.view(row);
    });
  }

  /** Asks the provider for a one-word translation, so a key or a model name is proved before anyone depends on it. */
  async test(actor: Actor): Promise<{ ok: boolean; provider: string | null; code?: AiUnavailableCode }> {
    requirePermission(actor, 'settings:manage');
    const resolved = this.resolve(await this.row());
    if (!resolved.provider) return { ok: false, provider: null, code: resolved.code };
    try {
      await resolved.provider.translate({ from: 'pt', to: 'en', fields: { word: { text: 'notícia', format: 'plain' } }, guidelines: '', signal: AbortSignal.timeout(20_000) });
      return { ok: true, provider: resolved.provider.id };
    } catch (error) {
      return { ok: false, provider: resolved.provider.id, code: error instanceof AiUnavailableException ? error.code : 'ai_provider_failed' };
    }
  }

  private get environmentKey(): string | undefined {
    return this.config.get<string>('GEMINI_API_KEY')?.trim() || undefined;
  }

  private get production(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private async row(): Promise<SettingsRow> {
    const [row]: SettingsRow[] = await this.database.query(`SELECT site_name, ai_provider, ai_api_key_encrypted, ai_text_model, ai_image_model, ai_images
      FROM public.settings WHERE singleton`);
    return row;
  }

  private resolve(row: SettingsRow): Resolution {
    if (row.ai_provider === 'disabled') return { provider: null, code: 'ai_disabled' };
    if (row.ai_provider === 'local') return { provider: new LocalProvider() };
    const key = this.readKey(row.ai_api_key_encrypted) ?? this.environmentKey;
    if (key) {
      return {
        provider: new GeminiProvider(this.createClient(key),
          row.ai_text_model ?? this.config.get<string>('GEMINI_TEXT_MODEL') ?? DEFAULT_GEMINI_TEXT_MODEL,
          row.ai_image_model ?? this.config.get<string>('GEMINI_IMAGE_MODEL') ?? DEFAULT_GEMINI_IMAGE_MODEL),
      };
    }
    // Without any key, an installation still exercises every flow through the local provider; production must choose it.
    if (row.ai_provider === 'auto' && !this.production) return { provider: new LocalProvider() };
    return { provider: null, code: 'ai_unconfigured' };
  }

  /** A stored key that no longer opens (moved, tampered with, another `APP_SECRET_KEY`) counts as none. */
  private readKey(encrypted: string | null): string | undefined {
    if (!encrypted) return undefined;
    try {
      return this.cipher.decrypt(encrypted, 'ai-api-key', OWNER);
    } catch {
      this.logger.warn('The stored AI provider key could not be read');
      return undefined;
    }
  }

  private nextKey(input: string | undefined, current: string | null): string | null {
    if (input === undefined) return current;
    const key = input.trim();
    if (!key) return null;
    if (key.length < 20 || key.length > 256 || /\s/.test(key)) throw new BadRequestException({ statusCode: 400, message: 'Invalid API key', code: 'ai_key_invalid' });
    return this.cipher.encrypt(key, 'ai-api-key', OWNER);
  }

  private model(input: string | null | undefined, current: string | null): string | null {
    if (input === undefined) return current;
    const value = input?.trim() ?? '';
    if (!value) return null;
    if (!MODEL.test(value)) throw new BadRequestException({ statusCode: 400, message: 'Invalid model name', code: 'ai_model_invalid' });
    return value;
  }

  private effective(resolved: Resolution, row: SettingsRow): EffectiveAi {
    const { provider } = resolved;
    return provider
      ? { available: true, provider: provider.id, generative: provider.generative, textModel: provider.textModel, imageModel: provider.imageModel, images: row.ai_images && provider.imageModel !== null }
      : { available: false, provider: null, generative: false, textModel: null, imageModel: null, images: false, code: resolved.code };
  }

  private view(row: SettingsRow) {
    return {
      provider: row.ai_provider, apiKeySet: row.ai_api_key_encrypted !== null, environmentKeySet: this.environmentKey !== undefined,
      textModel: row.ai_text_model, imageModel: row.ai_image_model, images: row.ai_images,
      defaults: { textModel: DEFAULT_GEMINI_TEXT_MODEL, imageModel: DEFAULT_GEMINI_IMAGE_MODEL },
      effective: this.effective(this.resolve(row), row),
    };
  }
}

type Resolution = { provider: AiProvider; code?: undefined } | { provider: null; code: AiUnavailableCode };
