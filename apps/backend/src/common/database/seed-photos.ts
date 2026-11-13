import sharp from 'sharp';
import type { CommonsPhoto } from './seed-demo-content.js';

/**
 * Covers of the demonstration seed: the openly licensed photographs named in `seed-demo-content.ts`, fetched from
 * Wikimedia Commons at seed time (nothing is kept in the repository) and cropped to the covers' 16:9. Development only:
 * the host is fixed, the transfer is bounded, and the bytes then go through the same re-encoding as any upload.
 */

const COMMONS = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
/** Wikimedia asks automated clients for a descriptive User-Agent; this one names the tool, not the person running it. */
const USER_AGENT = 'PortalMetaNewsDemoSeed/1.0 (development seed; https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)';
const MAX_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const COVER = { width: 1920, height: 1080 } as const;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function download(file: string): Promise<Buffer> {
  // 1920 is one of Wikimedia's standard thumbnail widths; a smaller original is served as it is.
  const response = await fetch(`${COMMONS}${encodeURIComponent(file)}?width=${COVER.width}`, {
    headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const host = new URL(response.url).hostname;
  if (!host.endsWith('.wikimedia.org')) throw new Error('Unexpected host');
  if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('Too large');
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > MAX_BYTES) throw new Error('Too large');
  return data;
}

/** The photograph cropped to 16:9 around its most salient region, as a high-quality JPEG; `null` when it cannot be fetched. */
export async function fetchCommonsPhoto(photo: CommonsPhoto): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const original = await download(photo.file);
      return await sharp(original, { limitInputPixels: 80_000_000 }).rotate()
        .resize(COVER.width, COVER.height, { fit: 'cover', position: 'attention' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    } catch {
      // Wikimedia throttles bursts: back off and try again before giving up on this photo.
      await wait(4000 * (attempt + 1));
    }
  }
  return null;
}

/** The credit line stored with the media item: author, licence and source, within the column's 160 characters. */
export function commonsCredit(photo: CommonsPhoto): string {
  return `${photo.author} (${photo.license}), via Wikimedia Commons`.slice(0, 160);
}
