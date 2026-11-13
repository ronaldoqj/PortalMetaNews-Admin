import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, constants, mkdir, readdir, rename, rm, stat, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  assertContentLength, assertSafeContentType, assertSafeFolder, assertSafeObjectKey, StorageService, type ObjectReadOptions,
} from './storage.service.js';

/** Where the local driver keeps files when `STORAGE_LOCAL_DIR` is not set: beside the API, ignored by Git. */
export const DEFAULT_LOCAL_STORAGE_DIRECTORY = 'storage';

/**
 * The store on the server's own disk: one file per object, at its key below the root. For development and for a
 * single server with a persistent volume; several API replicas need the S3 driver. A write lands in a temporary
 * file first and is renamed into place, so a reader never sees half a file and a failed upload leaves nothing.
 */
@Injectable()
export class LocalStorageService extends StorageService {
  readonly driver = 'local' as const;
  readonly root: string;

  constructor(directory: string | undefined, base = process.cwd()) {
    super();
    const configured = directory?.trim() || DEFAULT_LOCAL_STORAGE_DIRECTORY;
    this.root = isAbsolute(configured) ? resolve(configured) : resolve(base, configured);
  }

  get configured(): boolean {
    return true;
  }

  async checkConnection(): Promise<void> {
    try {
      await mkdir(this.root, { recursive: true });
      await access(this.root, constants.R_OK | constants.W_OK);
    } catch {
      throw new ServiceUnavailableException('Local storage directory is not writable');
    }
  }

  async uploadRawObject(key: string, body: Buffer | Uint8Array | Readable, mimeType?: string, contentLength?: number): Promise<void> {
    const path = this.path(key);
    if (mimeType !== undefined) assertSafeContentType(mimeType);
    assertContentLength(contentLength);
    const temporary = `${path}.${randomBytes(8).toString('hex')}.part`;
    try {
      await mkdir(dirname(path), { recursive: true });
      await pipeline(body instanceof Readable ? body : Readable.from([body]), createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
      if (contentLength !== undefined && (await stat(temporary)).size !== contentLength) throw new Error('Truncated upload');
      await rename(temporary, path);
    } catch {
      await unlink(temporary).catch(() => undefined);
      throw new ServiceUnavailableException('Object upload failed');
    }
  }

  async getObjectStream(key: string, options: ObjectReadOptions = {}): Promise<Readable> {
    const path = this.path(key);
    try {
      if (!(await stat(path)).isFile()) throw new Error('Not a file');
    } catch {
      throw new NotFoundException('Object not found');
    }
    return createReadStream(path, options.range ? { start: options.range.start, end: options.range.end } : {});
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await unlink(this.path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new ServiceUnavailableException('Object deletion failed');
    }
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    for (const key of keys) await this.deleteObject(key);
  }

  async deletePrefix(prefix: string): Promise<number> {
    const folder = join(this.root, assertSafeFolder(prefix));
    this.assertInside(folder);
    try {
      const count = await countFiles(folder);
      await rm(folder, { recursive: true, force: true });
      return count;
    } catch {
      throw new ServiceUnavailableException('Prefix deletion failed');
    }
  }

  /** The file of a key, which validation keeps inside the root. */
  private path(key: string): string {
    const path = join(this.root, assertSafeObjectKey(key));
    this.assertInside(path);
    return path;
  }

  private assertInside(path: string): void {
    if (!resolve(path).startsWith(`${this.root}${sep}`)) throw new ServiceUnavailableException('Invalid storage path');
  }
}

async function countFiles(directory: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }
  let count = 0;
  for (const entry of entries) {
    count += entry.isDirectory() ? await countFiles(join(directory, entry.name)) : 1;
  }
  return count;
}
