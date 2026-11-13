import { randomBytes } from 'node:crypto';
import { SITE_ASSETS_FOLDER } from './storage-layout.js';

/**
 * The portal's public brand images: logos and favicons for the light and dark schemes and the default image of a
 * shared link (`social`, 1200x630). Every surface renders them for anyone; they still live in the private store and
 * are only served through the API. Each upload gets a new random key, so a public URL never changes content and can
 * be cached forever.
 */

export const BRANDING_ASSET_SLOTS = ['logo', 'logoDark', 'favicon', 'faviconDark', 'social'] as const;
export type BrandingAssetSlot = (typeof BRANDING_ASSET_SLOTS)[number];
export const BRANDING_ASSET_MAX_BYTES = 5 * 1024 * 1024;

/** PNG for the favicon because every browser accepts it as an icon; JPEG for the share image, which every network reads. */
export const BRANDING_ASSET_FORMATS = {
  logo: 'webp', logoDark: 'webp', favicon: 'png', faviconDark: 'png', social: 'jpg',
} as const satisfies Record<BrandingAssetSlot, string>;
/** File-name prefix of each slot: lowercase only, so names stay plain URL path segments. */
export const BRANDING_ASSET_PREFIXES = {
  logo: 'logo', logoDark: 'logodark', favicon: 'favicon', faviconDark: 'favicondark', social: 'social',
} as const satisfies Record<BrandingAssetSlot, string>;
export const BRANDING_ASSET_MIME_TYPES = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' } as const;

const ASSET_FILE = /^(logo|logodark|favicon|favicondark|social)-[0-9a-f]{32}\.(webp|png|jpg)$/;
const SLOT_BY_PREFIX = Object.fromEntries(
  Object.entries(BRANDING_ASSET_PREFIXES).map(([slot, prefix]) => [prefix, slot]),
) as Record<string, BrandingAssetSlot>;

export function isBrandingAssetSlot(value: unknown): value is BrandingAssetSlot {
  return (BRANDING_ASSET_SLOTS as readonly unknown[]).includes(value);
}

export function brandingAssetKey(slot: BrandingAssetSlot): string {
  return `${SITE_ASSETS_FOLDER}branding/${BRANDING_ASSET_PREFIXES[slot]}-${randomBytes(16).toString('hex')}.${BRANDING_ASSET_FORMATS[slot]}`;
}

/** The public part of a key: the file name the surfaces put in their URLs. */
export function brandingAssetFile(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1);
}

/** Recognizes only file names produced by {@link brandingAssetKey}, with the format of their slot. */
export function parseBrandingAssetFile(file: string): { slot: BrandingAssetSlot; mimeType: string } | undefined {
  const match = ASSET_FILE.exec(file);
  const slot = match ? SLOT_BY_PREFIX[match[1]] : undefined;
  if (!slot || match![2] !== BRANDING_ASSET_FORMATS[slot]) return undefined;
  return { slot, mimeType: BRANDING_ASSET_MIME_TYPES[BRANDING_ASSET_FORMATS[slot]] };
}
