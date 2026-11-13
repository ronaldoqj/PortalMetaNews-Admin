import { Readable } from 'node:stream';
import { StorageService, type ObjectReadOptions, type StorageDriver } from '../../src/common/storage/storage.service.js';

/** An object store held in memory: what a suite writes is what it reads, and nothing reaches a disk or a bucket. */
export class MemoryStorage extends StorageService {
  readonly driver: StorageDriver = 'local';
  readonly objects = new Map<string, Buffer>();

  get configured(): boolean { return true; }

  async checkConnection(): Promise<void> { /* always reachable */ }

  async uploadRawObject(key: string, body: Buffer | Uint8Array | Readable): Promise<void> {
    const chunks: Buffer[] = [];
    if (body instanceof Readable) for await (const chunk of body) chunks.push(Buffer.from(chunk as Uint8Array));
    else chunks.push(Buffer.from(body));
    this.objects.set(key, Buffer.concat(chunks));
  }

  async getObjectStream(key: string, options: ObjectReadOptions = {}): Promise<Readable> {
    const object = this.objects.get(key);
    if (!object) throw new Error('Object not found');
    return Readable.from([options.range ? object.subarray(options.range.start, options.range.end + 1) : object]);
  }

  async deleteObject(key: string): Promise<void> { this.objects.delete(key); }

  async deleteObjects(keys: readonly string[]): Promise<void> { for (const key of keys) this.objects.delete(key); }

  async deletePrefix(prefix: string): Promise<number> {
    const keys = [...this.objects.keys()].filter((key) => key.startsWith(prefix));
    await this.deleteObjects(keys);
    return keys.length;
  }

  keysUnder(prefix: string): string[] { return [...this.objects.keys()].filter((key) => key.startsWith(prefix)); }
}
