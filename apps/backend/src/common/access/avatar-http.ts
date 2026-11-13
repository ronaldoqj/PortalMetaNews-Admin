import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import type { Readable } from 'node:stream';
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPE, renderAvatarImage } from '../storage/avatar-image.js';
import { pipeToResponse } from '../storage/pipe-to-response.js';

/** One image per request and nothing else, kept in memory: the original may still carry EXIF/GPS. */
export const AVATAR_UPLOAD_OPTIONS = { limits: { fileSize: AVATAR_MAX_BYTES, files: 1, fields: 0 } };

/** Re-encodes the uploaded photo before anything is stored: no original byte reaches the bucket. */
export async function uploadedAvatar(file: { buffer?: unknown } | undefined): Promise<Buffer> {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Image file is required');
  return renderAvatarImage(file.buffer);
}

/** Photos are personal data: never cached by shared caches, never sniffed as another type. */
export function sendAvatar(response: Response, image: Readable): void {
  response.status(200);
  response.setHeader('Content-Type', AVATAR_MIME_TYPE);
  response.setHeader('Cache-Control', 'private, max-age=86400');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Disposition', 'inline');
  pipeToResponse(image, response);
}
