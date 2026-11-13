import { BadRequestException, HttpException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import sharp from 'sharp';
import { detectImageType, MAX_IMAGE_PIXELS } from './file-types.js';

// Decoded pixels must not outlive the request in the libvips cache.
sharp.cache(false);

/** Upload limit of a member's profile photo; the stored square WebP is a few kilobytes. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_SIZE = 256;
export const AVATAR_MIME_TYPE = 'image/webp';

/**
 * Accepts PNG, JPEG or WebP by their leading bytes only, applies the EXIF orientation, crops to a
 * centred square and re-encodes as WebP. sharp writes no metadata unless asked to, so no EXIF, GPS,
 * XMP, ICC profile or trailing data of the original survives.
 */
export async function renderAvatarImage(input: Buffer): Promise<Buffer> {
  if (!Buffer.isBuffer(input) || !input.length) throw new BadRequestException('Image file is required');
  if (input.length > AVATAR_MAX_BYTES) throw new PayloadTooLargeException('Image exceeds the size limit');
  if (!detectImageType(input)) throw new UnsupportedMediaTypeException('Only PNG, JPEG or WebP images are accepted');
  let buffer: Buffer;
  try {
    buffer = await sharp(input, { failOn: 'warning', limitInputPixels: MAX_IMAGE_PIXELS, animated: false })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error) {
    throw error instanceof HttpException ? error : new BadRequestException('Image could not be processed');
  }
  if (detectImageType(buffer) !== AVATAR_MIME_TYPE) throw new BadRequestException('Image could not be processed');
  return buffer;
}
