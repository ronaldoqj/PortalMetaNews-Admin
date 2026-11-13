import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service.js';
import { S3StorageService, s3Settings } from './s3-storage.service.js';
import { StorageService } from './storage.service.js';

/** The store the environment chose (`STORAGE_DRIVER`): the local disk unless an S3-compatible bucket is configured. */
export function createStorage(configuration: Record<string, unknown>): StorageService {
  return configuration.STORAGE_DRIVER === 's3'
    ? new S3StorageService(s3Settings(configuration))
    : new LocalStorageService(typeof configuration.STORAGE_LOCAL_DIR === 'string' ? configuration.STORAGE_LOCAL_DIR : undefined);
}

const STORAGE_SETTINGS = [
  'NODE_ENV', 'STORAGE_DRIVER', 'STORAGE_LOCAL_DIR', 'S3_ENDPOINT', 'S3_BUCKET_NAME', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_REGION',
  'S3_KEY_PREFIX', 'S3_FORCE_PATH_STYLE',
] as const;

@Global()
@Module({
  providers: [{
    provide: StorageService,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => createStorage(Object.fromEntries(STORAGE_SETTINGS.map((key) => [key, config.get<string>(key)]))),
  }],
  exports: [StorageService],
})
export class StorageModule {}
