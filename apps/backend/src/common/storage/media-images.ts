import { BadRequestException, HttpException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import sharp from 'sharp';
import { detectImageType, MAX_IMAGE_PIXELS } from './file-types.js';
import { mediaFolder } from './storage-layout.js';

// Decoded pixels must not outlive the request in the libvips cache.
sharp.cache(false);

/**
 * The renditions every image of the media library is stored in: three widths for responsive `srcset` (WebP) and the
 * 1200x630 crop social networks show for a shared article (JPEG, which every network reads). The original upload is
 * never kept: re-encoding drops every EXIF, GPS, XMP and ICC block a photographer's camera wrote.
 */
export const MEDIA_VARIANTS = {
  sm: { width: 480, format: 'webp' },
  md: { width: 960, format: 'webp' },
  lg: { width: 1600, format: 'webp' },
  og: { width: 1200, height: 630, format: 'jpg' },
} as const;
export type MediaVariant = keyof typeof MEDIA_VARIANTS;
export const MEDIA_VARIANT_NAMES = Object.keys(MEDIA_VARIANTS) as MediaVariant[];
export const MEDIA_MIME_TYPES = { webp: 'image/webp', jpg: 'image/jpeg' } as const;

export function isMediaVariant(value: unknown): value is MediaVariant {
  return typeof value === 'string' && value in MEDIA_VARIANTS;
}

export function mediaVariantKey(mediaId: string, variant: MediaVariant): string {
  return `${mediaFolder(mediaId)}${variant}.${MEDIA_VARIANTS[variant].format}`;
}

export function mediaVariantMimeType(variant: MediaVariant): string {
  return MEDIA_MIME_TYPES[MEDIA_VARIANTS[variant].format];
}

export interface RenderedMedia {
  width: number;
  height: number;
  /** The dominant colour, shown while the image loads. */
  color: string;
  variants: Record<MediaVariant, Buffer>;
  bytes: number;
}

/**
 * Accepts PNG, JPEG or WebP by their leading bytes only (SVG and every markup never match a signature), applies the
 * EXIF orientation and writes every rendition. Smaller images are never enlarged.
 */
export async function renderMediaImage(input: Buffer, maxBytes: number): Promise<RenderedMedia> {
  if (!Buffer.isBuffer(input) || !input.length) throw new BadRequestException('Image file is required');
  if (input.length > maxBytes) throw new PayloadTooLargeException('Image exceeds the size limit');
  if (!detectImageType(input)) throw new UnsupportedMediaTypeException('Only PNG, JPEG or WebP images are accepted');
  try {
    const source = sharp(input, { failOn: 'warning', limitInputPixels: MAX_IMAGE_PIXELS, animated: false }).rotate();
    const oriented = await source.clone().toBuffer({ resolveWithObject: true });
    const { width, height } = oriented.info;
    const stats = await sharp(oriented.data).stats();
    const color = `#${[stats.dominant.r, stats.dominant.g, stats.dominant.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    const variants = {} as Record<MediaVariant, Buffer>;
    for (const name of MEDIA_VARIANT_NAMES) {
      const spec = MEDIA_VARIANTS[name];
      const pipeline = sharp(oriented.data);
      variants[name] = 'height' in spec
        ? await pipeline.resize(spec.width, spec.height, { fit: 'cover', position: 'attention' }).flatten({ background: '#ffffff' })
          .jpeg({ quality: 84, mozjpeg: true }).toBuffer()
        : await pipeline.resize({ width: spec.width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    }
    const bytes = Object.values(variants).reduce((sum, buffer) => sum + buffer.length, 0);
    return { width, height, color, variants, bytes };
  } catch (error) {
    throw error instanceof HttpException ? error : new BadRequestException('Image could not be processed');
  }
}
