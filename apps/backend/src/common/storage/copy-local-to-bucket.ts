import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { LocalStorageService } from './local-storage.service.js';
import { createStorage } from './storage.module.js';

/**
 * `npm run storage:copy-local`: moving to a bucket. Copies every file of the local store (`STORAGE_LOCAL_DIR`) to the
 * bucket configured with `STORAGE_DRIVER=s3`, under the same keys, so the media, brand images and profile photos the
 * database points to keep working. Idempotent (an object already in the bucket is overwritten with the same bytes);
 * the local files are left in place, to be removed by hand once the site shows them from the bucket.
 */

const MIME_TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

async function* files(directory: string): AsyncGenerator<string> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

try {
  if (process.env.STORAGE_DRIVER !== 's3') throw new Error('Set STORAGE_DRIVER=s3 and the S3_* settings first');
  const bucket = createStorage(process.env);
  await bucket.checkConnection();
  const local = new LocalStorageService(process.env.STORAGE_LOCAL_DIR);
  let copied = 0;
  let bytes = 0;
  try {
    for await (const path of files(local.root)) {
      const key = relative(local.root, path).split(sep).join('/');
      const body = await readFile(path);
      await bucket.uploadRawObject(key, body, MIME_TYPES[extname(path).toLowerCase()], body.length);
      copied += 1;
      bytes += body.length;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  console.info(`Copied ${copied} files (${(bytes / 1024 / 1024).toFixed(1)} MB) from the local store to the bucket.`);
} catch (error) {
  console.error(`Copy failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
}
