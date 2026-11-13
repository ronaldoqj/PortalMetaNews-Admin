import {
  Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/access/access.controller.js';
import type { Actor } from '../../common/access/permissions.js';
import { CONTENT_LOCALES, type ContentLocale } from '../../common/i18n/locales.js';
import { BRANDING_ASSET_MAX_BYTES, BRANDING_ASSET_SLOTS, type BrandingAssetSlot } from '../../common/storage/branding-assets.js';
import { PanelController } from '../panel-controller.js';
import { CONTACT_STATUSES, CONTACT_TOPICS, ContactMessagesService, type ContactStatus, type ContactTopic } from './contact-messages.service.js';
import { LEGAL_EDITIONS, LEGAL_KINDS, LEGAL_LIMITS, type LegalEdition, type LegalKind } from './site-legal.js';
import { SiteLegalService } from './site-legal.service.js';
import { SiteSettingsService } from './site-settings.service.js';
import { THEME_SURFACES, ThemesService, type ThemeSurface } from './themes.service.js';

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ThemeDto {
  @IsOptional() @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsObject() tokens?: Record<string, unknown>;
}

export class CreateThemeDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsObject() tokens?: Record<string, unknown>;
  /** Duplicates another theme's tokens instead of taking `tokens`. */
  @IsOptional() @IsUUID() from?: string;
}

export class ActivateThemeDto {
  @IsIn(THEME_SURFACES) surface!: ThemeSurface;
}

export class IdentityDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(80) siteName!: string;
  @IsOptional() @IsObject() tagline?: Record<string, unknown>;
  @IsOptional() @IsObject() description?: Record<string, unknown>;
  @IsIn(CONTENT_LOCALES) defaultLocale!: ContentLocale;
  @IsOptional() @ValidateIf((_object: unknown, value: unknown) => value !== null && value !== '') @IsEmail() @MaxLength(254) contactEmail?: string | null;
  @IsOptional() @IsObject() social?: Record<string, unknown>;
}

export class LegalDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(LEGAL_LIMITS.title) title!: string;
  @IsString() @MaxLength(LEGAL_LIMITS.summary) summary!: string;
  @IsString() @MinLength(1) @MaxLength(LEGAL_LIMITS.content) content!: string;
}

export class ContactListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page?: number;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(CONTACT_STATUSES) status?: ContactStatus;
  @IsOptional() @IsIn(CONTACT_TOPICS) topic?: ContactTopic;
}

export class ContactStatusDto {
  @IsIn(CONTACT_STATUSES) status!: ContactStatus;
}

@Controller('panel/themes')
@PanelController()
export class ThemesController {
  constructor(@Inject(ThemesService) private readonly themes: ThemesService) {}

  @Get() @RequirePermissions('themes:manage')
  list(@CurrentUser() actor: Actor) {
    return this.themes.list(actor);
  }

  @Post() @RequirePermissions('themes:manage')
  create(@CurrentUser() actor: Actor, @Body() body: CreateThemeDto) {
    return this.themes.create(actor, body);
  }

  @Get(':id') @RequirePermissions('themes:manage')
  get(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.themes.get(actor, id);
  }

  @Patch(':id') @RequirePermissions('themes:manage')
  update(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: ThemeDto) {
    return this.themes.update(actor, id, body);
  }

  @Delete(':id') @HttpCode(204) @RequirePermissions('themes:manage')
  remove(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.themes.remove(actor, id);
  }

  @Post(':id/activate') @HttpCode(200) @RequirePermissions('themes:manage')
  activate(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: ActivateThemeDto) {
    return this.themes.activate(actor, id, body.surface);
  }
}

@Controller('panel/site')
@PanelController()
export class SiteIdentityController {
  constructor(@Inject(SiteSettingsService) private readonly site: SiteSettingsService) {}

  @Get() @RequirePermissions('site:manage', 'themes:manage')
  identity(@CurrentUser() actor: Actor) {
    return this.site.identity(actor);
  }

  @Put() @RequirePermissions('site:manage')
  update(@CurrentUser() actor: Actor, @Body() body: IdentityDto) {
    return this.site.updateIdentity(actor, body);
  }

  @Post('assets/:slot') @RequirePermissions('themes:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: BRANDING_ASSET_MAX_BYTES, files: 1, fields: 0 } }))
  upload(@CurrentUser() actor: Actor, @Param('slot') slot: string, @UploadedFile() file: { buffer?: Buffer } | undefined) {
    return this.site.uploadAsset(actor, this.slot(slot), file?.buffer ?? Buffer.alloc(0));
  }

  @Delete('assets/:slot') @RequirePermissions('themes:manage')
  remove(@CurrentUser() actor: Actor, @Param('slot') slot: string) {
    return this.site.removeAsset(actor, this.slot(slot));
  }

  private slot(value: string): BrandingAssetSlot {
    if (!(BRANDING_ASSET_SLOTS as readonly string[]).includes(value)) throw new NotFoundException();
    return value as BrandingAssetSlot;
  }
}

@Controller('panel/legal')
@PanelController()
export class LegalController {
  constructor(@Inject(SiteLegalService) private readonly legal: SiteLegalService) {}

  @Get() @RequirePermissions('site:manage')
  overview(@CurrentUser() actor: Actor) {
    return this.legal.overview(actor);
  }

  @Get(':kind/:edition') @RequirePermissions('site:manage')
  edition(@CurrentUser() actor: Actor, @Param('kind') kind: string, @Param('edition') edition: string) {
    return this.legal.edition(actor, ...this.document(kind, edition));
  }

  @Put(':kind/:edition') @RequirePermissions('site:manage')
  save(@CurrentUser() actor: Actor, @Param('kind') kind: string, @Param('edition') edition: string, @Body() body: LegalDto) {
    return this.legal.save(actor, ...this.document(kind, edition), body);
  }

  /** Back to the default text of the edition. */
  @Delete(':kind/:edition') @RequirePermissions('site:manage')
  restore(@CurrentUser() actor: Actor, @Param('kind') kind: string, @Param('edition') edition: string) {
    return this.legal.restore(actor, ...this.document(kind, edition));
  }

  private document(kind: string, edition: string): [LegalKind, LegalEdition] {
    if (!(LEGAL_KINDS as readonly string[]).includes(kind) || !(LEGAL_EDITIONS as readonly string[]).includes(edition)) {
      throw new NotFoundException();
    }
    return [kind as LegalKind, edition as LegalEdition];
  }
}

@Controller('panel/contacts')
@PanelController()
export class ContactsController {
  constructor(@Inject(ContactMessagesService) private readonly contacts: ContactMessagesService) {}

  @Get() @RequirePermissions('contacts:read')
  list(@CurrentUser() actor: Actor, @Query() query: ContactListDto) {
    return this.contacts.list(actor, { ...query, page: query.page ?? 1 });
  }

  @Get(':id') @RequirePermissions('contacts:read')
  get(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.contacts.get(actor, id);
  }

  @Put(':id/status') @RequirePermissions('contacts:read')
  status(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: ContactStatusDto) {
    return this.contacts.setStatus(actor, id, body.status);
  }
}
