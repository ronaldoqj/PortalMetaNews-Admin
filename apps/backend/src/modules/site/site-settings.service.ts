import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { DataSource } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { i18nString, type I18nString } from '../../common/i18n/i18n-string.js';
import type { ContentLocale } from '../../common/i18n/locales.js';
import {
  BRANDING_ASSET_SLOTS, brandingAssetFile, brandingAssetKey, parseBrandingAssetFile, type BrandingAssetSlot,
} from '../../common/storage/branding-assets.js';
import { renderBrandingImage } from '../../common/storage/branding-image.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { ThemesService } from './themes.service.js';

export const SOCIAL_NETWORKS = ['instagram', 'facebook', 'x', 'youtube', 'tiktok', 'linkedin', 'whatsapp', 'telegram'] as const;
export type SocialNetwork = typeof SOCIAL_NETWORKS[number];
const ASSET_COLUMNS: Record<BrandingAssetSlot, string> = {
  logo: 'logo_key', logoDark: 'logo_dark_key', favicon: 'favicon_key', faviconDark: 'favicon_dark_key', social: 'social_key',
};

interface SettingsRow {
  site_name: string; tagline: I18nString; description: I18nString; default_locale: ContentLocale; contact_email: string | null;
  social: Partial<Record<SocialNetwork, string>>; logo_key: string | null; logo_dark_key: string | null; favicon_key: string | null;
  favicon_dark_key: string | null; social_key: string | null; updated_at: Date;
}

export interface SiteIdentityInput {
  siteName: string;
  tagline?: unknown;
  description?: unknown;
  defaultLocale: ContentLocale;
  contactEmail?: string | null;
  social?: Record<string, unknown>;
}

/**
 * The portal's identity: its name, tagline and description in both languages, its default language, the contact
 * address, its social profiles and its brand images. Edited with `site:manage` (identity) and `themes:manage` (images);
 * read by every page of the site and the panel.
 */
@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name);

  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(ThemesService) private readonly themes: ThemesService,
  ) {}

  private async row(): Promise<SettingsRow> {
    const [row]: SettingsRow[] = await this.database.query(`SELECT site_name, tagline, description, default_locale, contact_email, social,
      logo_key, logo_dark_key, favicon_key, favicon_dark_key, social_key, updated_at FROM public.settings WHERE singleton`);
    return row;
  }

  private assets(row: SettingsRow): Record<BrandingAssetSlot, string | null> {
    return Object.fromEntries(BRANDING_ASSET_SLOTS.map((slot) => {
      const key = row[ASSET_COLUMNS[slot] as keyof SettingsRow] as string | null;
      return [slot, key ? brandingAssetFile(key) : null];
    })) as Record<BrandingAssetSlot, string | null>;
  }

  /** What every page renders: identity, images and both active themes. Public: nothing here is private. */
  async publicView() {
    const [row, themes] = await Promise.all([this.row(), this.themes.active()]);
    return {
      siteName: row.site_name, tagline: row.tagline, description: row.description, defaultLocale: row.default_locale,
      social: row.social, assets: this.assets(row), themes: { site: themes.site.tokens, panel: themes.panel.tokens },
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async identity(actor: Actor) {
    requirePermission(actor, 'site:manage', 'themes:manage');
    const row = await this.row();
    return {
      siteName: row.site_name, tagline: row.tagline, description: row.description, defaultLocale: row.default_locale,
      contactEmail: row.contact_email, social: row.social, assets: this.assets(row),
    };
  }

  async updateIdentity(actor: Actor, input: SiteIdentityInput) {
    requirePermission(actor, 'site:manage');
    const social: Partial<Record<SocialNetwork, string>> = {};
    for (const [network, value] of Object.entries(input.social ?? {})) {
      if (!(SOCIAL_NETWORKS as readonly string[]).includes(network)) throw new BadRequestException({ statusCode: 400, message: 'Unknown network', code: 'social_invalid' });
      if (value === null || value === '') continue;
      if (typeof value !== 'string' || value.length > 300 || !/^https:\/\/[^\s"<>]+$/.test(value)) {
        throw new BadRequestException({ statusCode: 400, message: 'Invalid profile address', code: 'social_invalid' });
      }
      social[network as SocialNetwork] = value;
    }
    const name = input.siteName.trim();
    if (!name || name.length > 80) throw new BadRequestException();
    await this.database.transaction(async (manager) => {
      await manager.query(`UPDATE public.settings SET site_name = $1, tagline = $2::jsonb, description = $3::jsonb, default_locale = $4,
        contact_email = $5, social = $6::jsonb, updated_at = now(), updated_by = $7 WHERE singleton`, [
        name, JSON.stringify(i18nString(input.tagline, { maxLength: 160, required: false })),
        JSON.stringify(i18nString(input.description, { maxLength: 300, required: false })), input.defaultLocale,
        input.contactEmail?.trim().toLowerCase() || null, JSON.stringify(social), actor.userId,
      ]);
      await audit(manager, { actorId: actor.userId, action: 'site.identity_updated' });
    });
    return this.identity(actor);
  }

  /**
   * Replaces one brand image. The image is rebuilt (no byte of the upload is kept), stored under a new random key and
   * referenced; the previous object is deleted only after the new reference is committed.
   */
  async uploadAsset(actor: Actor, slot: BrandingAssetSlot, file: Buffer) {
    requirePermission(actor, 'themes:manage');
    const image = await renderBrandingImage(file, slot);
    const key = brandingAssetKey(slot);
    await this.storage.uploadRawObject(key, image.buffer, image.mimeType, image.buffer.length);
    let previous: string | null = null;
    try {
      previous = await this.database.transaction(async (manager) => {
        const column = ASSET_COLUMNS[slot];
        const [current]: Array<{ key: string | null }> = await manager.query(`SELECT ${column} AS key FROM public.settings WHERE singleton FOR UPDATE`);
        await manager.query(`UPDATE public.settings SET ${column} = $1, updated_at = now(), updated_by = $2 WHERE singleton`, [key, actor.userId]);
        await audit(manager, { actorId: actor.userId, action: 'site.asset_updated', metadata: { slot } });
        return current?.key ?? null;
      });
    } catch (error) {
      await this.storage.deleteObject(key).catch(() => undefined);
      throw error;
    }
    if (previous) await this.storage.deleteObject(previous).catch(() => this.logger.warn('A replaced brand image could not be removed'));
    return this.identity(actor);
  }

  async removeAsset(actor: Actor, slot: BrandingAssetSlot) {
    requirePermission(actor, 'themes:manage');
    const previous = await this.database.transaction(async (manager) => {
      const column = ASSET_COLUMNS[slot];
      const [current]: Array<{ key: string | null }> = await manager.query(`SELECT ${column} AS key FROM public.settings WHERE singleton FOR UPDATE`);
      if (!current?.key) return null;
      await manager.query(`UPDATE public.settings SET ${column} = NULL, updated_at = now(), updated_by = $1 WHERE singleton`, [actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'site.asset_removed', metadata: { slot } });
      return current.key;
    });
    if (previous) await this.storage.deleteObject(previous).catch(() => this.logger.warn('A removed brand image could not be deleted'));
    return this.identity(actor);
  }

  /** A brand image by its public file name; only names the settings reference now are served. */
  async assetStream(file: string): Promise<{ stream: Readable; mimeType: string }> {
    const parsed = parseBrandingAssetFile(file);
    if (!parsed) throw new NotFoundException();
    const row = await this.row();
    const key = row[ASSET_COLUMNS[parsed.slot] as keyof SettingsRow] as string | null;
    if (!key || brandingAssetFile(key) !== file) throw new NotFoundException();
    return { stream: await this.storage.getObjectStream(key), mimeType: parsed.mimeType };
  }
}
