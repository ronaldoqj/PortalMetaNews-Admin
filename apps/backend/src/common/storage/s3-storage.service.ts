import {
  DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, S3Client,
  type GetObjectCommandOutput, type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import type { Readable } from 'node:stream';
import {
  assertContentLength, assertSafeContentType, assertSafeFolder, assertSafeObjectKey, DEFAULT_CONTENT_TYPE, normalizeKeyPrefix, StorageService,
  type ObjectReadOptions,
} from './storage.service.js';

export const S3_REQUIRED_FIELDS = ['S3_ENDPOINT', 'S3_BUCKET_NAME', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_KEY_PREFIX'] as const;
const CONNECTION_TIMEOUT_MS = 10_000;
const OBJECT_OPERATION_TIMEOUT_MS = 30_000;
const MISSING_OBJECT_NAMES = ['NoSuchKey', 'NotFound', 'NoSuchObject'];
const LIST_PAGE_SIZE = 1000;

export interface S3Settings {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** The environment's namespace inside a shared bucket (`dev`, `pre`, `prd`). */
  keyPrefix: string;
  /** MinIO and other servers that address the bucket in the path. */
  forcePathStyle: boolean;
}

/**
 * Validates the bucket settings, reporting key names only. The endpoint must be HTTPS; plain HTTP is accepted only
 * for a local server (MinIO in development), never in production.
 */
export function validateS3Configuration(configuration: Record<string, unknown>): void {
  const missing = S3_REQUIRED_FIELDS.filter((field) => typeof configuration[field] !== 'string' || !(configuration[field] as string).trim());
  if (missing.length) throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
  let endpoint: URL;
  try {
    endpoint = new URL(String(configuration.S3_ENDPOINT));
  } catch {
    throw new Error('Invalid S3_ENDPOINT');
  }
  const local = ['localhost', '127.0.0.1'].includes(endpoint.hostname) && configuration.NODE_ENV !== 'production';
  if ((endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Invalid S3_ENDPOINT');
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(String(configuration.S3_BUCKET_NAME))) throw new Error('Invalid S3_BUCKET_NAME');
  normalizeKeyPrefix(String(configuration.S3_KEY_PREFIX));
}

export function s3Settings(configuration: Record<string, unknown>): S3Settings {
  validateS3Configuration(configuration);
  return {
    endpoint: String(configuration.S3_ENDPOINT), bucket: String(configuration.S3_BUCKET_NAME),
    accessKeyId: String(configuration.S3_ACCESS_KEY_ID), secretAccessKey: String(configuration.S3_SECRET_ACCESS_KEY),
    region: String(configuration.S3_REGION || 'auto'), keyPrefix: normalizeKeyPrefix(String(configuration.S3_KEY_PREFIX)),
    forcePathStyle: configuration.S3_FORCE_PATH_STYLE === 'true',
  };
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; Code?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return MISSING_OBJECT_NAMES.includes(String(candidate.name)) || MISSING_OBJECT_NAMES.includes(String(candidate.Code)) ||
    candidate.$metadata?.httpStatusCode === 404;
}

/** The store in a private S3-compatible bucket: Cloudflare R2, AWS S3 or MinIO. Every key is scoped to the environment prefix. */
@Injectable()
export class S3StorageService extends StorageService implements OnModuleDestroy {
  readonly driver = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(settings: S3Settings) {
    super();
    this.bucket = settings.bucket;
    this.prefix = settings.keyPrefix;
    this.client = new S3Client({
      endpoint: settings.endpoint,
      region: settings.region,
      forcePathStyle: settings.forcePathStyle,
      credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 3000, requestTimeout: 5000 },
    });
  }

  get configured(): boolean {
    return true;
  }

  async checkConnection(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }), { abortSignal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS) });
    } catch {
      throw new ServiceUnavailableException('Bucket connection failed; verify endpoint, bucket and credentials');
    }
  }

  async uploadRawObject(key: string, body: Buffer | Uint8Array | Readable, mimeType?: string, contentLength?: number, options: { timeoutMs?: number } = {}): Promise<void> {
    const objectKey = assertSafeObjectKey(key);
    const contentType = mimeType === undefined ? DEFAULT_CONTENT_TYPE : assertSafeContentType(mimeType);
    assertContentLength(contentLength);
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket, Key: `${this.prefix}/${objectKey}`, Body: body, ContentType: contentType,
        ...(contentLength === undefined ? {} : { ContentLength: contentLength }),
      }), { abortSignal: AbortSignal.timeout(options.timeoutMs ?? OBJECT_OPERATION_TIMEOUT_MS) });
    } catch {
      throw new ServiceUnavailableException('Object upload failed');
    }
  }

  async getObjectStream(key: string, options: ObjectReadOptions = {}): Promise<Readable> {
    const objectKey = assertSafeObjectKey(key);
    const { range } = options;
    let response: GetObjectCommandOutput;
    try {
      response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket, Key: `${this.prefix}/${objectKey}`, ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
      }), { abortSignal: AbortSignal.timeout(options.timeoutMs ?? OBJECT_OPERATION_TIMEOUT_MS) });
    } catch (error) {
      if (isMissingObjectError(error)) throw new NotFoundException('Object not found');
      throw new ServiceUnavailableException('Object retrieval failed');
    }
    if (!response.Body) throw new ServiceUnavailableException('Object retrieval failed');
    return response.Body as Readable;
  }

  async deleteObject(key: string): Promise<void> {
    const objectKey = assertSafeObjectKey(key);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${this.prefix}/${objectKey}` }), {
        abortSignal: AbortSignal.timeout(OBJECT_OPERATION_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('Object deletion failed');
    }
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    if (!Array.isArray(keys)) throw new BadRequestException('Invalid object keys');
    const objectKeys = keys.map(assertSafeObjectKey);
    try {
      for (let offset = 0; offset < objectKeys.length; offset += LIST_PAGE_SIZE) {
        await this.deleteScopedKeys(objectKeys.slice(offset, offset + LIST_PAGE_SIZE).map((key) => `${this.prefix}/${key}`));
      }
    } catch {
      throw new ServiceUnavailableException('Object deletion failed');
    }
  }

  async deletePrefix(prefix: string): Promise<number> {
    const scope = `${this.prefix}/${assertSafeFolder(prefix)}`;
    let deleted = 0;
    try {
      // Each deleted page shrinks the listing, so the first page is listed again until it is empty.
      for (;;) {
        const page: ListObjectsV2CommandOutput = await this.client.send(new ListObjectsV2Command({
          Bucket: this.bucket, Prefix: scope, MaxKeys: LIST_PAGE_SIZE,
        }), { abortSignal: AbortSignal.timeout(OBJECT_OPERATION_TIMEOUT_MS) });
        const keys = (page.Contents ?? []).flatMap((object) => typeof object.Key === 'string' && object.Key.startsWith(scope) ? [object.Key] : []);
        if (!keys.length) break;
        await this.deleteScopedKeys(keys);
        deleted += keys.length;
      }
    } catch {
      throw new ServiceUnavailableException('Prefix deletion failed');
    }
    return deleted;
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  /** One `DeleteObjects` request for keys that already carry the environment prefix; a partial failure fails closed. */
  private async deleteScopedKeys(keys: string[]): Promise<void> {
    const result = await this.client.send(new DeleteObjectsCommand({
      Bucket: this.bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }), { abortSignal: AbortSignal.timeout(OBJECT_OPERATION_TIMEOUT_MS) });
    if (result.Errors?.length) throw new Error('Partial object deletion');
  }
}
