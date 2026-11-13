import {
  Body, Catch, Controller, createParamDecorator, Delete, ForbiddenException, Get, HttpCode, HttpException, Inject, Injectable, Post, Req,
  SetMetadata, UnauthorizedException, UseFilters, UseGuards, UseInterceptors,
  type ArgumentsHost, type CallHandler, type CanActivate, type ExceptionFilter, type ExecutionContext, type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AccessService } from './access.service.js';
import { requirePermission, type Actor, type Permission } from './permissions.js';

type PanelRequest = Request & { actor?: Actor };

/** Constant-time comparison of two secrets of any length (both are hashed to the same size first). */
function sameSecret(expected: string, provided: string): boolean {
  return timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(provided).digest());
}

/** Refusals keep their status and body; anything unexpected is a 503 that says nothing about the cause. */
@Catch()
export class PanelErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException && status < 500 ? error.getResponse()
      : error instanceof HttpException && status === 503 ? error.getResponse()
        : { statusCode: status, message: 'Service unavailable' };
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) {
      response.end();
      return;
    }
    response.setHeader('Cache-Control', 'private, no-store');
    response.status(status).json(body);
  }
}

@Injectable()
export class PrivateResponse implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'private, no-store');
    return next.handle();
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): Actor => {
  const actor = context.switchToHttp().getRequest<PanelRequest>().actor;
  if (!actor) throw new UnauthorizedException();
  return actor;
});

/** Reads the bearer session the frontend's server forwards from its HttpOnly cookie. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AccessService) private readonly access: AccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PanelRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException();
    request.actor = await this.access.authenticate(authorization.slice(7));
    return true;
  }
}

const PERMISSIONS_METADATA = 'requiredPermissions';
/** Any of the given permissions; an empty list admits every signed-in account. */
export const RequirePermissions = (...anyOf: Permission[]) => SetMetadata(PERMISSIONS_METADATA, anyOf);

/**
 * Runs after {@link SessionGuard}. Deny by default: a handler without the decorator is refused, so a new endpoint
 * cannot be exposed by forgetting to declare what it needs.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_METADATA, [context.getHandler(), context.getClass()]);
    if (!permissions) throw new ForbiddenException();
    requirePermission(context.switchToHttp().getRequest<PanelRequest>().actor, ...permissions);
    return true;
  }
}

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class LoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class InitialSetupDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsOptional() @IsString() @MaxLength(256) setupToken?: string;
}

export class ForcePasswordChangeDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{43}$/) temporaryToken!: string;
  @IsString() @MinLength(12) @MaxLength(128) newPassword!: string;
}

/** Sign-in, installation and the session of the panel. */
@Controller('auth')
@UseFilters(PanelErrorFilter)
@UseInterceptors(PrivateResponse)
export class AccessController {
  constructor(
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(ConfigService) private readonly configuration: ConfigService,
  ) {}

  /** Public: whether the panel still needs its first account, and what the installer must provide. */
  @Get('setup-status')
  async setupStatus() {
    const setupRequired = await this.access.setupRequired();
    return { setupRequired, setupTokenRequired: setupRequired && this.setupTokenRequired, setupAvailable: setupRequired && this.setupAvailable };
  }

  /** Public, but inert once any account exists (409); in production it also needs the setup token. */
  @Post('initial-setup')
  @HttpCode(201)
  initialSetup(@Body() body: InitialSetupDto) {
    if (!this.setupAvailable) throw new ForbiddenException();
    const expected = this.configuration.get<string>('PANEL_SETUP_TOKEN');
    if (expected && !sameSecret(expected, body.setupToken ?? '')) throw new ForbiddenException();
    return this.access.initialSetup(body);
  }

  private get setupTokenRequired(): boolean {
    return !!this.configuration.get<string>('PANEL_SETUP_TOKEN');
  }

  /** Production never accepts an installation without the token: the first visitor must not win the panel. */
  private get setupAvailable(): boolean {
    return this.setupTokenRequired || this.configuration.get<string>('NODE_ENV') !== 'production';
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.access.signIn(body.email, body.password);
  }

  @Post('force-password-change')
  @HttpCode(200)
  forcePasswordChange(@Body() body: ForcePasswordChangeDto) {
    return this.access.forcePasswordChange(body.temporaryToken, body.newPassword);
  }

  @Get('session')
  @UseGuards(SessionGuard)
  session(@CurrentUser() actor: Actor) {
    return actor;
  }

  @Delete('session')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async logout(@Req() request: Request): Promise<void> {
    await this.access.revoke(request.headers.authorization!.slice(7));
  }
}
