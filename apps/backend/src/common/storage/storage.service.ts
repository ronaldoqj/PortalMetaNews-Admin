import { BadRequestException } from '@nestjs/common';
import type { Readable } from 'node:stream';

export const MAX_OBJECT_KEY_BYTES = 1024;
const MAX_CONTENT_TYPE_LENGTH = 255;
export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
const ENCODED_TRAVERSAL = /%2e|%2f|%5c/i;
const CONTENT_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

export type StorageDriver = 'local' | 's3';

export interface ObjectReadOptions {
  /** An inclusive byte range of the object. */
  range?: { start: number; end: number };
  /** Bounds the whole transfer; long streams pass a longer one. */
  timeoutMs?: number;
}

/**
 * The private store of every file of the portal: media renditions, brand images and profile photos. Keys are logical
 * paths below the environment's root (`site/...`, `media/<id>/...`, see `storage-layout.ts`), random and never derived from
 * a file name. Two drivers implement it: the local filesystem (development, or a single server with a volume) and
 * any S3-compatible bucket (Cloudflare R2, AWS S3, MinIO). Files are only ever served through authorized API paths.
 */
export abstract class StorageService {
  abstract readonly driver: StorageDriver;

  /** Whether files can be stored at all; uploads answer 503 while they cannot. */
  abstract get configured(): boolean;

  /** Proves the store is reachable and writable settings are right, without storing anything. */
  abstract checkConnection(): Promise<void>;

  /**
   * Stores a payload under an explicit key. Streamed bodies should declare `contentLength`, so a truncated
   * upload is refused instead of stored.
   */
  abstract uploadRawObject(key: string, body: Buffer | Uint8Array | Readable, mimeType?: string, contentLength?: number, options?: { timeoutMs?: number }): Promise<void>;

  /** Opens a read stream of an object, or of a byte range of it. The caller owns the stream. 404 when absent. */
  abstract getObjectStream(key: string, options?: ObjectReadOptions): Promise<Readable>;

  /** Idempotent: succeeds when the key is already absent. */
  abstract deleteObject(key: string): Promise<void>;

  abstract deleteObjects(keys: readonly string[]): Promise<void>;

  /** Deletes everything under a logical folder (`media/<id>/`); returns how many objects were removed. */
  abstract deletePrefix(prefix: string): Promise<number>;
}

/** Detects C0 control characters and DEL, which never belong in an object key. */
function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) return true;
  }
  return false;
}

/** Rejects separators, traversal segments and percent-encoded traversal inside a key path. */
function isUnsafeKeyPath(value: string): boolean {
  return value.includes('\\') || hasControlCharacters(value) || ENCODED_TRAVERSAL.test(value) ||
    value.split('/').some((segment) => !segment || segment === '.' || segment === '..');
}

/**
 * Rejects object keys that could escape the store's root once the value is combined with a filesystem path or a
 * decoded URL. Keys are opaque strings, so the check runs on the raw value and on percent-encoded traversal forms.
 */
export function assertSafeObjectKey(key: string): string {
  if (typeof key !== 'string' || !key || key !== key.trim() || Buffer.byteLength(key, 'utf8') > MAX_OBJECT_KEY_BYTES ||
    key.startsWith('/') || isUnsafeKeyPath(key)) {
    throw new BadRequestException('Invalid object key');
  }
  return key;
}

/**
 * Normalizes the operator-configured environment prefix of a shared bucket (`dev`, `pre`, `prd`). Surrounding
 * slashes are tolerated; traversal, empty segments and oversized values are refused, so one environment can
 * never write outside its own namespace.
 */
export function normalizeKeyPrefix(prefix: string): string {
  const normalized = typeof prefix === 'string' ? prefix.trim().replace(/^\/+/, '').replace(/\/+$/, '') : '';
  if (!normalized || Buffer.byteLength(normalized, 'utf8') > MAX_OBJECT_KEY_BYTES || isUnsafeKeyPath(normalized)) {
    throw new Error('Invalid storage key prefix');
  }
  return normalized;
}

/** Validates a logical folder such as `media/{id}/`: a safe key path that ends with `/`. */
export function assertSafeFolder(prefix: string): string {
  if (typeof prefix !== 'string' || prefix.length < 2 || !prefix.endsWith('/')) throw new BadRequestException('Invalid object prefix');
  assertSafeObjectKey(prefix.slice(0, -1));
  return prefix;
}

/** Accepts a bare media type such as `application/octet-stream`, without parameters. */
export function assertSafeContentType(contentType: string): string {
  if (typeof contentType !== 'string' || contentType.length > MAX_CONTENT_TYPE_LENGTH || !CONTENT_TYPE_PATTERN.test(contentType)) {
    throw new BadRequestException('Invalid content type');
  }
  return contentType;
}

export function assertContentLength(contentLength: number | undefined): void {
  if (contentLength !== undefined && (!Number.isSafeInteger(contentLength) || contentLength < 0)) {
    throw new BadRequestException('Invalid content length');
  }
}
