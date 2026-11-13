import {
  Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf, ValidateNested,
} from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/access/access.controller.js';
import type { Actor } from '../../common/access/permissions.js';
import { CONTENT_LOCALES, type ContentLocale } from '../../common/i18n/locales.js';
import { PanelController } from '../panel-controller.js';
import { CATEGORY_COLORS, CategoriesService } from './categories.service.js';
import { FRONT_PAGE_LIMITS, FrontPageService } from './front-page.service.js';
import { MediaService } from './media.service.js';
import { NEWS_ACTIONS, NEWS_STATUSES, NewsService, type NewsAction, type NewsStatus } from './news.service.js';
import { TagsService } from './tags.service.js';
import { TranslationService } from './translation.service.js';

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);
const nullable = (_object: unknown, value: unknown) => value !== null;

export class NewsListDto {
  @IsOptional() @IsIn(NEWS_STATUSES) status?: NewsStatus;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() authorId?: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(['true', 'false']) mine?: string;
  @IsOptional() @IsIn(['updated', 'published', 'views']) sort?: 'updated' | 'published' | 'views';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page?: number;
}

class TranslationStateDto {
  @IsBoolean() enabled!: boolean;
  @IsIn(CONTENT_LOCALES) source!: ContentLocale;
}

/** Every field optional: the builder saves what changed. Shapes are checked here, contents by the service. */
export class NewsDto {
  @IsOptional() @IsObject() title?: Record<string, unknown>;
  @IsOptional() @IsObject() subtitle?: Record<string, unknown>;
  @IsOptional() @IsObject() body?: Record<string, unknown>;
  @IsOptional() @IsObject() slug?: Record<string, unknown>;
  @IsOptional() @ValidateIf(nullable) @IsUUID() categoryId?: string | null;
  @IsOptional() @ValidateIf(nullable) @IsUUID() coverMediaId?: string | null;
  @IsOptional() @IsObject() coverCaption?: Record<string, unknown>;
  @IsOptional() @ValidateIf(nullable) @IsUUID() authorId?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(15) @IsUUID('all', { each: true }) tagIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(2) @IsIn(CONTENT_LOCALES, { each: true }) locales?: string[];
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() breaking?: boolean;
  @IsOptional() @IsObject() seoTitle?: Record<string, unknown>;
  @IsOptional() @IsObject() seoDescription?: Record<string, unknown>;
  @IsOptional() @ValidateNested() @Type(() => TranslationStateDto) translation?: TranslationStateDto;
  @IsOptional() @IsBoolean() aiAssisted?: boolean;
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
}

export class NewsStatusDto {
  @IsIn(NEWS_ACTIONS) action!: NewsAction;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class TranslateDto {
  @IsIn(CONTENT_LOCALES) from!: ContentLocale;
  @IsIn(CONTENT_LOCALES) to!: ContentLocale;
  @IsObject() fields!: Record<string, { text: string; format: 'plain' | 'html' }>;
}

export class CategoryDto {
  @IsOptional() @IsObject() name?: Record<string, unknown>;
  @IsOptional() @IsObject() slug?: { pt?: string; en?: string };
  @IsOptional() @IsObject() description?: Record<string, unknown>;
  @IsOptional() @IsIn(CATEGORY_COLORS) color?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() showInMenu?: boolean;
}

export class OrderDto {
  @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) ids!: string[];
}

export class TagListDto {
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page?: number;
}

export class TagDto {
  @IsOptional() @IsObject() name?: Record<string, unknown>;
  @IsOptional() @IsObject() slug?: { pt?: string; en?: string };
}

export class MediaListDto {
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(['upload', 'ai']) source?: 'upload' | 'ai';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page?: number;
}

export class MediaMetadataDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsObject() alt?: Record<string, unknown>;
  @IsOptional() @IsObject() caption?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(160) credit?: string;
}

/** Multipart fields arrive as strings: the localized ones as JSON. */
export class MediaUploadDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) alt?: string;
  @IsOptional() @IsString() @MaxLength(4000) caption?: string;
  @IsOptional() @IsString() @MaxLength(160) credit?: string;
}

export class MediaGenerateDto extends MediaMetadataDto {
  @Transform(trimmed) @IsString() @MaxLength(1000) prompt!: string;
}

export class FrontPageDto {
  @ValidateIf(nullable) @IsUUID() headline!: string | null;
  @IsArray() @ArrayMaxSize(FRONT_PAGE_LIMITS.highlights) @IsUUID('all', { each: true }) highlights!: string[];
  @IsArray() @ArrayMaxSize(FRONT_PAGE_LIMITS.sections) @IsUUID('all', { each: true }) sections!: string[];
}

const json = (value: string | undefined): unknown => {
  if (!value) return undefined;
  try { return JSON.parse(value); } catch { return null; }
};

@Controller('panel/news')
@PanelController()
export class NewsController {
  constructor(@Inject(NewsService) private readonly news: NewsService) {}

  @Get() @RequirePermissions('news:read')
  list(@CurrentUser() actor: Actor, @Query() query: NewsListDto) {
    return this.news.list(actor, { ...query, mine: query.mine === 'true' });
  }

  @Post() @RequirePermissions('news:write')
  create(@CurrentUser() actor: Actor, @Body() body: NewsDto) {
    return this.news.create(actor, body);
  }

  @Get(':id') @RequirePermissions('news:read')
  get(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.news.get(actor, id);
  }

  @Patch(':id') @RequirePermissions('news:write', 'news:edit_all')
  update(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: NewsDto) {
    return this.news.update(actor, id, body);
  }

  @Delete(':id') @HttpCode(204) @RequirePermissions('news:delete')
  remove(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.news.remove(actor, id);
  }

  /** The editorial workflow: submit, return, publish, schedule, unpublish, archive, restore. */
  @Post(':id/status') @HttpCode(200) @RequirePermissions('news:read')
  transition(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: NewsStatusDto) {
    return this.news.transition(actor, id, body.action, body.scheduledAt);
  }

  @Get(':id/revisions') @RequirePermissions('news:read')
  revisions(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.news.revisions(actor, id);
  }

  @Get(':id/revisions/:revisionId') @RequirePermissions('news:read')
  revision(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Param('revisionId', ParseUUIDPipe) revisionId: string) {
    return this.news.revision(actor, id, revisionId);
  }

  @Post(':id/revisions/:revisionId/restore') @HttpCode(200) @RequirePermissions('news:write', 'news:edit_all')
  restore(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Param('revisionId', ParseUUIDPipe) revisionId: string) {
    return this.news.restoreRevision(actor, id, revisionId);
  }
}

@Controller('panel/translate')
@PanelController()
export class TranslateController {
  constructor(@Inject(TranslationService) private readonly translation: TranslationService) {}

  /** Machine translation of the builder's fields; nothing is stored. */
  @Post() @HttpCode(200) @RequirePermissions('ai:use')
  translate(@CurrentUser() actor: Actor, @Body() body: TranslateDto) {
    return this.translation.translate(actor, body);
  }
}

@Controller('panel/categories')
@PanelController()
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Get() @RequirePermissions()
  list(@CurrentUser() actor: Actor) {
    return this.categories.list(actor);
  }

  @Post() @RequirePermissions('taxonomy:manage')
  create(@CurrentUser() actor: Actor, @Body() body: CategoryDto) {
    return this.categories.create(actor, { ...body, name: body.name });
  }

  @Put('order') @RequirePermissions('taxonomy:manage')
  reorder(@CurrentUser() actor: Actor, @Body() body: OrderDto) {
    return this.categories.reorder(actor, body.ids);
  }

  @Patch(':id') @RequirePermissions('taxonomy:manage')
  update(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: CategoryDto) {
    return this.categories.update(actor, id, body);
  }

  @Delete(':id') @HttpCode(204) @RequirePermissions('taxonomy:manage')
  remove(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(actor, id);
  }
}

@Controller('panel/tags')
@PanelController()
export class TagsController {
  constructor(@Inject(TagsService) private readonly tags: TagsService) {}

  @Get() @RequirePermissions()
  list(@CurrentUser() actor: Actor, @Query() query: TagListDto) {
    return this.tags.list(actor, query);
  }

  @Post() @RequirePermissions('taxonomy:manage', 'news:write')
  create(@CurrentUser() actor: Actor, @Body() body: TagDto) {
    return this.tags.create(actor, { name: body.name, slug: body.slug });
  }

  @Patch(':id') @RequirePermissions('taxonomy:manage')
  update(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: TagDto) {
    return this.tags.update(actor, id, body);
  }

  @Delete(':id') @HttpCode(204) @RequirePermissions('taxonomy:manage')
  remove(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.tags.remove(actor, id);
  }
}

@Controller('panel/media')
@PanelController()
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get() @RequirePermissions('news:read', 'media:manage')
  list(@CurrentUser() actor: Actor, @Query() query: MediaListDto) {
    return this.media.list(actor, query);
  }

  /** One image per request, kept in memory until it is re-encoded: no byte of the upload reaches the store. */
  @Post() @RequirePermissions('media:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 8 } }))
  upload(@CurrentUser() actor: Actor, @UploadedFile() file: { buffer?: Buffer } | undefined, @Body() body: MediaUploadDto) {
    return this.media.upload(actor, file?.buffer ?? Buffer.alloc(0), { title: body.title, alt: json(body.alt), caption: json(body.caption), credit: body.credit });
  }

  /** An image generated by the AI from a description; slow, so the panel waits up to two minutes. */
  @Post('generate') @RequirePermissions('media:manage')
  generate(@CurrentUser() actor: Actor, @Body() body: MediaGenerateDto) {
    return this.media.generate(actor, body);
  }

  @Get(':id') @RequirePermissions('news:read', 'media:manage')
  get(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.get(actor, id);
  }

  @Patch(':id') @RequirePermissions('media:manage')
  update(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: MediaMetadataDto) {
    return this.media.update(actor, id, body);
  }

  @Delete(':id') @HttpCode(204) @RequirePermissions('media:manage')
  remove(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.remove(actor, id);
  }
}

@Controller('panel/front-page')
@PanelController()
export class FrontPageController {
  constructor(@Inject(FrontPageService) private readonly frontPage: FrontPageService) {}

  @Get() @RequirePermissions('news:read')
  get(@CurrentUser() actor: Actor) {
    return this.frontPage.view(actor);
  }

  @Put() @RequirePermissions('front_page:manage')
  update(@CurrentUser() actor: Actor, @Body() body: FrontPageDto) {
    return this.frontPage.update(actor, body);
  }
}
