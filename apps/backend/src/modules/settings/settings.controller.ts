import { Body, Controller, Get, HttpCode, Inject, Injectable, Post, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { DataSource } from 'typeorm';
import { CurrentUser, RequirePermissions } from '../../common/access/access.controller.js';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { AI_PROVIDERS, AiService, type AiProviderSetting } from '../../common/ai/ai.service.js';
import { EmailSettingsService } from '../../common/mail/email-settings.service.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { PanelController } from '../panel-controller.js';

const optional = (_object: unknown, value: unknown) => value !== null && value !== '';
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

export class AiSettingsDto {
  @IsIn(AI_PROVIDERS) provider!: AiProviderSetting;
  /** Write-only: omitted keeps the stored key, an empty string removes it. */
  @IsOptional() @IsString() @MaxLength(256) apiKey?: string;
  @IsOptional() @ValidateIf(optional) @IsString() @Matches(MODEL) textModel?: string | null;
  @IsOptional() @ValidateIf(optional) @IsString() @Matches(MODEL) imageModel?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) guidelines?: string;
  @IsOptional() @IsBoolean() images?: boolean;
}

export class EmailSettingsDto {
  @IsBoolean() enabled!: boolean;
  @IsOptional() @ValidateIf(optional) @IsString() @MaxLength(253) host?: string | null;
  @IsOptional() @ValidateIf((_object: unknown, value: unknown) => value !== null) @IsInt() @Min(1) @Max(65535) port?: number | null;
  @IsOptional() @IsBoolean() secure?: boolean;
  @IsOptional() @ValidateIf(optional) @IsString() @MaxLength(254) user?: string | null;
  @IsOptional() @IsString() @MaxLength(512) password?: string;
  @IsOptional() @ValidateIf(optional) @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)) @IsEmail() fromEmail?: string | null;
  @IsOptional() @ValidateIf(optional) @IsString() @MaxLength(100) fromName?: string | null;
}

/** Where files are kept and how much the media library holds; read-only, the store is chosen by the environment. */
@Injectable()
export class StorageInfoService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async view(actor: Actor) {
    requirePermission(actor, 'settings:manage');
    const [totals]: Array<{ items: number; bytes: string; generated: number }> = await this.database.query(
      `SELECT count(*)::int AS items, coalesce(sum(bytes), 0)::bigint AS bytes, count(*) FILTER (WHERE source = 'ai')::int AS generated FROM public.media`);
    let reachable = true;
    try { await this.storage.checkConnection(); } catch { reachable = false; }
    return {
      driver: this.storage.driver, configured: this.storage.configured, reachable, uploadMaxMb: this.config.get<number>('UPLOAD_MAX_MB') ?? 15,
      bucket: this.storage.driver === 's3' ? this.config.get<string>('S3_BUCKET_NAME') ?? null : null,
      media: { items: totals.items, bytes: Number(totals.bytes), generated: totals.generated },
    };
  }
}

@Controller('panel/settings')
@PanelController()
export class SettingsController {
  constructor(
    @Inject(AiService) private readonly ai: AiService,
    @Inject(EmailSettingsService) private readonly email: EmailSettingsService,
    @Inject(StorageInfoService) private readonly storage: StorageInfoService,
  ) {}

  @Get('ai') @RequirePermissions('settings:manage')
  aiSettings(@CurrentUser() actor: Actor) {
    return this.ai.settings(actor);
  }

  @Put('ai') @RequirePermissions('settings:manage')
  updateAi(@CurrentUser() actor: Actor, @Body() body: AiSettingsDto) {
    return this.ai.updateSettings(actor, body);
  }

  /** Proves the key and model with a one-word translation. */
  @Post('ai/test') @HttpCode(200) @RequirePermissions('settings:manage')
  testAi(@CurrentUser() actor: Actor) {
    return this.ai.test(actor);
  }

  /** Whether the AI answers now: any account may know it, so the builder can offer translation. */
  @Get('ai/status') @RequirePermissions()
  aiStatus() {
    return this.ai.status();
  }

  @Get('email') @RequirePermissions('settings:manage')
  emailSettings(@CurrentUser() actor: Actor) {
    return this.email.view(actor);
  }

  @Put('email') @RequirePermissions('settings:manage')
  updateEmail(@CurrentUser() actor: Actor, @Body() body: EmailSettingsDto) {
    return this.email.update(actor, body);
  }

  /** Sends a test message to the signed-in account. */
  @Post('email/test') @HttpCode(200) @RequirePermissions('settings:manage')
  testEmail(@CurrentUser() actor: Actor) {
    return this.email.test(actor);
  }

  @Get('storage') @RequirePermissions('settings:manage')
  storageInfo(@CurrentUser() actor: Actor) {
    return this.storage.view(actor);
  }
}
