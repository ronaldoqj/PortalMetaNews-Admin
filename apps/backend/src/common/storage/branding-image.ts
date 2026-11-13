import { BadRequestException, HttpException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import sharp, { type ResizeOptions } from 'sharp';
import { BRANDING_ASSET_FORMATS, BRANDING_ASSET_MAX_BYTES, BRANDING_ASSET_MIME_TYPES, type BrandingAssetSlot } from './branding-assets.js';
import { detectImageType, MAX_IMAGE_PIXELS } from './file-types.js';

// Decoded pixels must not outlive the request in the libvips cache.
sharp.cache(false);

const SLOT_SIZES: Record<BrandingAssetSlot, { width: number; height: number; resize: ResizeOptions }> = {
  logo: { width: 720, height: 200, resize: { fit: 'inside', withoutEnlargement: true } },
  logoDark: { width: 720, height: 200, resize: { fit: 'inside', withoutEnlargement: true } },
  favicon: { width: 64, height: 64, resize: { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } } },
  faviconDark: { width: 64, height: 64, resize: { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } } },
  social: { width: 1200, height: 630, resize: { fit: 'cover', position: 'attention' } },
};

export interface BrandingImage {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Accepts PNG, JPEG or WebP by their leading bytes only (SVG, HTML and every other markup never match
 * a signature), applies the EXIF orientation, resizes for the slot and re-encodes. sharp writes no
 * metadata unless asked to, so the output carries pixels and format headers only: no EXIF, GPS, XMP,
 * ICC profile, text chunk or trailing markup survives.
 */
export async function renderBrandingImage(input: Buffer, slot: BrandingAssetSlot): Promise<BrandingImage> {
  if (!Buffer.isBuffer(input) || !input.length) throw new BadRequestException('Image file is required');
  if (input.length > BRANDING_ASSET_MAX_BYTES) throw new PayloadTooLargeException('Image exceeds the size limit');
  if (!detectImageType(input)) throw new UnsupportedMediaTypeException('Only PNG, JPEG or WebP images are accepted');
  const { width, height, resize } = SLOT_SIZES[slot];
  const mimeType = BRANDING_ASSET_MIME_TYPES[BRANDING_ASSET_FORMATS[slot]];
  let buffer: Buffer;
  try {
    const pipeline = sharp(input, { failOn: 'warning', limitInputPixels: MAX_IMAGE_PIXELS, animated: false })
      .rotate()
      .resize(width, height, resize);
    const format = BRANDING_ASSET_FORMATS[slot];
    buffer = format === 'png' ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : format === 'jpg' ? await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 86, mozjpeg: true }).toBuffer()
        : await pipeline.webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  } catch (error) {
    throw error instanceof HttpException ? error : new BadRequestException('Image could not be processed');
  }
  if (detectImageType(buffer) !== mimeType) throw new BadRequestException('Image could not be processed');
  return { buffer, mimeType };
}
