import { Body, Controller, Get, Header, HttpCode, Inject, NotFoundException, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Response } from 'express';
import { CONTENT_LOCALES, type ContentLocale } from '../../common/i18n/locales.js';
import { FormProtectionService } from '../../common/protection/form-protection.service.js';
import { isMediaVariant } from '../../common/storage/media-images.js';
import { sendPublicImage } from '../../common/storage/send-image.js';
import { CategoriesService } from '../newsroom/categories.service.js';
import { MediaService } from '../newsroom/media.service.js';
import { PublicNewsService } from '../newsroom/public-news.service.js';
import { SLUG } from '../newsroom/slug.js';
import { CONTACT_TOPICS, ContactMessagesService, type ContactTopic } from '../site/contact-messages.service.js';
import { LEGAL_KINDS, type LegalKind } from '../site/site-legal.js';
import { SiteLegalService } from '../site/site-legal.service.js';
import { SiteSettingsService } from '../site/site-settings.service.js';
import { TeamService } from '../team/team.service.js';

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class LocaleDto {
  @IsIn(CONTENT_LOCALES) locale!: ContentLocale;
}

export class PublicListDto extends LocaleDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) page?: number;
  @IsOptional() @IsString() @MaxLength(160) category?: string;
  @IsOptional() @IsString() @MaxLength(160) tag?: string;
  @IsOptional() @IsUUID() author?: string;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(200) q?: string;
}

export class ContactDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(254) email!: string;
  @IsIn(CONTACT_TOPICS) topic!: ContactTopic;
  @IsString() @MinLength(1) @MaxLength(100_000) message!: string;
  @IsIn(CONTENT_LOCALES) locale!: ContentLocale;
  /** The honeypot: a field no person fills. */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

const slug = (value: string) => {
  if (!SLUG.test(value) || value.length > 160) throw new NotFoundException();
  return value;
};

/**
 * Everything the site reads, public and anonymous: published content only, in the language asked for. Answers are
 * never personalized; nothing about the request (address, browser) is read or kept.
 */
@Controller('public')
export class PublicController {
  constructor(
    @Inject(SiteSettingsService) private readonly site: SiteSettingsService,
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(PublicNewsService) private readonly news: PublicNewsService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(SiteLegalService) private readonly legal: SiteLegalService,
    @Inject(ContactMessagesService) private readonly contacts: ContactMessagesService,
    @Inject(FormProtectionService) private readonly protection: FormProtectionService,
    @Inject(TeamService) private readonly team: TeamService,
  ) {}

  /** The portal's identity, both active themes and the sections of the menu: what every page renders. */
  @Get('site')
  @Header('Cache-Control', 'no-store')
  async siteView() {
    const [site, categories] = await Promise.all([this.site.publicView(), this.categories.published()]);
    return { ...site, categories };
  }

  @Get('home')
  @Header('Cache-Control', 'no-store')
  home(@Query() query: LocaleDto) {
    return this.news.home(query.locale);
  }

  @Get('news')
  @Header('Cache-Control', 'no-store')
  list(@Query() query: PublicListDto) {
    return this.news.list(query.locale, query);
  }

  @Get('news/most-read')
  @Header('Cache-Control', 'no-store')
  mostRead(@Query() query: LocaleDto) {
    return this.news.mostRead(query.locale, 5);
  }

  @Get('news/by-slug/:slug')
  @Header('Cache-Control', 'no-store')
  article(@Param('slug') value: string, @Query() query: LocaleDto) {
    return this.news.article(query.locale, slug(value));
  }

  /** One read of an article, counted per day; the reader is never identified. */
  @Post('news/:id/view')
  @HttpCode(204)
  async view(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.news.view(id);
  }

  @Get('categories/:slug')
  @Header('Cache-Control', 'no-store')
  category(@Param('slug') value: string, @Query() query: LocaleDto) {
    return this.news.category(query.locale, slug(value));
  }

  @Get('tags/:slug')
  @Header('Cache-Control', 'no-store')
  tag(@Param('slug') value: string, @Query() query: LocaleDto) {
    return this.news.tag(query.locale, slug(value));
  }

  @Get('authors/:id')
  @Header('Cache-Control', 'no-store')
  author(@Param('id', ParseUUIDPipe) id: string, @Query() query: LocaleDto) {
    return this.news.author(query.locale, id);
  }

  @Get('authors/:id/avatar')
  async avatar(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response): Promise<void> {
    sendPublicImage(response, await this.team.publicAvatar(id), 'image/webp', 'public, max-age=3600');
  }

  @Get('feed')
  @Header('Cache-Control', 'no-store')
  feed(@Query() query: LocaleDto) {
    return this.news.feed(query.locale);
  }

  @Get('sitemap')
  @Header('Cache-Control', 'no-store')
  sitemap() {
    return this.news.sitemap();
  }

  @Get('media/:id/:variant')
  async mediaFile(@Param('id', ParseUUIDPipe) id: string, @Param('variant') variant: string, @Res() response: Response): Promise<void> {
    if (!isMediaVariant(variant)) throw new NotFoundException();
    const { stream, mimeType } = await this.media.stream(id, variant);
    sendPublicImage(response, stream, mimeType);
  }

  @Get('branding/assets/:file')
  async brandingAsset(@Param('file') file: string, @Res() response: Response): Promise<void> {
    const { stream, mimeType } = await this.site.assetStream(file);
    sendPublicImage(response, stream, mimeType);
  }

  @Get('legal/:kind')
  @Header('Cache-Control', 'no-store')
  legalDocument(@Param('kind') kind: string, @Query() query: LocaleDto) {
    if (!(LEGAL_KINDS as readonly string[]).includes(kind)) throw new NotFoundException();
    return this.legal.published(kind as LegalKind, query.locale);
  }

  @Post('contact')
  @HttpCode(201)
  async contact(@Body() body: ContactDto) {
    await this.protection.verifyContact(body.website ?? '');
    return this.contacts.submit(body);
  }
}
