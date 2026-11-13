import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser, RequirePermissions } from '../../common/access/access.controller.js';
import { AVATAR_UPLOAD_OPTIONS, sendAvatar, uploadedAvatar } from '../../common/access/avatar-http.js';
import { PERMISSIONS, type Actor, type Permission } from '../../common/access/permissions.js';
import { PanelController } from '../panel-controller.js';
import { AuditTrailService } from './audit-trail.service.js';
import { TeamService } from './team.service.js';

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RoleDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsArray() @ArrayMaxSize(PERMISSIONS.length) @IsIn(PERMISSIONS, { each: true }) permissions!: Permission[];
}

export class CreateUserDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail() @MaxLength(254) email!: string;
  @IsUUID() roleId!: string;
}

export class UpdateUserDto {
  @IsOptional() @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() jobTitle?: Record<string, unknown>;
  @IsOptional() @IsObject() bio?: Record<string, unknown>;
}

export class ProfileDto {
  @IsOptional() @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @IsObject() jobTitle?: Record<string, unknown>;
  @IsOptional() @IsObject() bio?: Record<string, unknown>;
}

export class AuditListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100_000) page?: number;
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsIn(['success', 'denied']) outcome?: 'success' | 'denied';
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() resourceId?: string;
}

@Controller('panel/team')
@PanelController()
export class TeamController {
  constructor(@Inject(TeamService) private readonly team: TeamService) {}

  @Get('roles') @RequirePermissions('users:manage')
  roles(@CurrentUser() actor: Actor) {
    return this.team.listRoles(actor);
  }

  @Post('roles') @RequirePermissions('users:manage')
  createRole(@CurrentUser() actor: Actor, @Body() body: RoleDto) {
    return this.team.createRole(actor, body);
  }

  @Put('roles/:id') @RequirePermissions('users:manage')
  updateRole(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: RoleDto) {
    return this.team.updateRole(actor, id, body);
  }

  @Delete('roles/:id') @HttpCode(204) @RequirePermissions('users:manage')
  deleteRole(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.deleteRole(actor, id);
  }

  @Get('users') @RequirePermissions('users:manage')
  users(@CurrentUser() actor: Actor) {
    return this.team.listUsers(actor);
  }

  /** Names of the accounts that may sign news, for the builder's byline. */
  @Get('authors') @RequirePermissions('news:read')
  authors(@CurrentUser() actor: Actor) {
    return this.team.authors(actor);
  }

  @Post('users') @RequirePermissions('users:manage')
  createUser(@CurrentUser() actor: Actor, @Body() body: CreateUserDto) {
    return this.team.createUser(actor, body);
  }

  @Patch('users/:id') @RequirePermissions('users:manage')
  updateUser(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateUserDto) {
    return this.team.updateUser(actor, id, body);
  }

  @Post('users/:id/temporary-password') @HttpCode(200) @RequirePermissions('users:manage')
  temporaryPassword(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.issueTemporaryPassword(actor, id);
  }

  @Get('users/:id/avatar') @RequirePermissions()
  async avatar(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    sendAvatar(response, await this.team.avatar(actor, id));
  }

  @Put('users/:id/avatar') @RequirePermissions('users:manage')
  @UseInterceptors(FileInterceptor('file', AVATAR_UPLOAD_OPTIONS))
  async uploadAvatar(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: { buffer: Buffer } | undefined) {
    return this.team.setAvatar(actor, id, await uploadedAvatar(file));
  }

  @Delete('users/:id/avatar') @RequirePermissions('users:manage')
  removeAvatar(@CurrentUser() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.removeAvatar(actor, id);
  }
}

@Controller('panel/profile')
@PanelController()
export class ProfileController {
  constructor(@Inject(TeamService) private readonly team: TeamService) {}

  @Get() @RequirePermissions()
  profile(@CurrentUser() actor: Actor) {
    return this.team.profile(actor);
  }

  @Patch() @RequirePermissions()
  update(@CurrentUser() actor: Actor, @Body() body: ProfileDto) {
    return this.team.updateProfile(actor, body);
  }

  @Put('avatar') @RequirePermissions()
  @UseInterceptors(FileInterceptor('file', AVATAR_UPLOAD_OPTIONS))
  async uploadAvatar(@CurrentUser() actor: Actor, @UploadedFile() file: { buffer: Buffer } | undefined) {
    return this.team.setAvatar(actor, actor.userId, await uploadedAvatar(file));
  }

  @Delete('avatar') @RequirePermissions()
  removeAvatar(@CurrentUser() actor: Actor) {
    return this.team.removeAvatar(actor, actor.userId);
  }
}

@Controller('panel/audit')
@PanelController()
export class AuditController {
  constructor(@Inject(AuditTrailService) private readonly trail: AuditTrailService) {}

  @Get() @RequirePermissions('audit:read')
  list(@CurrentUser() actor: Actor, @Query() query: AuditListDto) {
    return this.trail.list(actor, { ...query, page: query.page ?? 1 });
  }
}
