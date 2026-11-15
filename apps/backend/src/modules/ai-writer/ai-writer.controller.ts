import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Res } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser, RequirePermissions } from '../../common/access/access.controller.js';
import type { Actor } from '../../common/access/permissions.js';
import { CONTENT_LOCALES, type ContentLocale } from '../../common/i18n/locales.js';
import { PanelController } from '../panel-controller.js';
import { AiWriterService, BRIEF_MAX, type WriterEvent } from './ai-writer.service.js';

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class WriterOptionsDto {
  @IsOptional() @IsIn(CONTENT_LOCALES) language?: ContentLocale;
  @IsOptional() @IsIn(['neutral', 'explanatory', 'analytical', 'light']) tone?: 'neutral' | 'explanatory' | 'analytical' | 'light';
  @IsOptional() @IsIn(['short', 'medium', 'long']) length?: 'short' | 'medium' | 'long';
  @IsOptional() @IsBoolean() image?: boolean;
  /** A style's id, `none`, or `null` for the newsroom's default. */
  @IsOptional() @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @Matches(/^(none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/) styleId?: string | null;
}

export class CreateConversationDto {
  @IsOptional() @ValidateNested() @Type(() => WriterOptionsDto) options?: WriterOptionsDto;
  @IsOptional() @ValidateIf((_object: unknown, value: unknown) => value !== null) @IsUUID() newsId?: string | null;
}

export class UpdateConversationDto {
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(160) title?: string;
  @IsOptional() @ValidateNested() @Type(() => WriterOptionsDto) options?: WriterOptionsDto;
}

export class AskDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(BRIEF_MAX) content!: string;
  @IsOptional() @ValidateNested() @Type(() => WriterOptionsDto) options?: WriterOptionsDto;
}

export class ApplyDto {
  @IsOptional() @IsIn(['new', 'linked']) target?: 'new' | 'linked';
  @IsOptional() @ValidateIf((_object: unknown, value: unknown) => value !== null) @IsUUID() mediaId?: string | null;
}

export class IllustrateDto {
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1000) prompt?: string;
}

/** One server-sent event: its name and its data as one line of JSON. */
function frame(event: WriterEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** The AI writer. An account reaches only its own conversations; the service repeats every check. */
@Controller('panel/ai-writer')
@PanelController()
export class AiWriterController {
  constructor(@Inject(AiWriterService) private readonly writer: AiWriterService) {}

  @Get('status') @RequirePermissions('ai:use')
  status(@CurrentUser() actor: Actor) {
    return this.writer.status(actor);
  }

  /** The editorial styles to choose from (names only), the default first. */
  @Get('styles') @RequirePermissions('ai:use')
  styles(@CurrentUser() actor: Actor) {
    return this.writer.styleChoices(actor);
  }

  @Get('conversations') @RequirePermissions('ai:use')
  list(@CurrentUser() actor: Actor) {
    return this.writer.list(actor);
  }

  @Post('conversations') @RequirePermissions('ai:use')
  create(@CurrentUser() actor: Actor, @Body() body: CreateConversationDto) {
    return this.writer.create(actor, body);
  }

  @Get('conversations/:id') @RequirePermissions('ai:use')
  get(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.writer.get(actor, id);
  }

  @Patch('conversations/:id') @RequirePermissions('ai:use')
  update(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateConversationDto) {
    return this.writer.update(actor, id, body);
  }

  @Delete('conversations/:id') @HttpCode(204) @RequirePermissions('ai:use')
  remove(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.writer.remove(actor, id);
  }

  /**
   * Sends a brief and answers it as a stream of server-sent events (`user`, `status`, `delta`, `proposal`, `image`,
   * then `done` or `error`). What can refuse the request does so before the stream opens, as an ordinary error. When
   * the editor stops or leaves, the connection closes and what was written so far is kept.
   */
  @Post('conversations/:id/messages') @RequirePermissions('ai:use')
  async ask(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: AskDto, @Res() response: Response): Promise<void> {
    const context = await this.writer.prepare(actor, id, body);
    const abort = new AbortController();
    response.on('close', () => { if (!response.writableEnded) abort.abort(); });
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'private, no-store, no-transform');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    for await (const event of this.writer.answer(context, abort.signal)) {
      if (!response.writableEnded && !response.destroyed) response.write(frame(event));
    }
    if (!response.writableEnded) response.end();
  }

  /** Turns a proposal into a draft of the builder (or applies it to the conversation's news item). */
  @Post('messages/:id/apply') @HttpCode(200) @RequirePermissions('ai:use')
  apply(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: ApplyDto) {
    return this.writer.apply(actor, id, body);
  }

  @Post('messages/:id/illustrate') @HttpCode(200) @RequirePermissions('ai:use')
  illustrate(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: IllustrateDto) {
    return this.writer.illustrate(actor, id, body);
  }
}

export type { WriterEvent };
