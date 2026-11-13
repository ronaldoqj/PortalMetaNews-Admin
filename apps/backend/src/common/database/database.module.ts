import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_MIGRATIONS } from './migrations/index.js';

const DATABASE_RETRY_ATTEMPTS = 5;
const DATABASE_RETRY_DELAY_MS = 3_000;

/**
 * The one PostgreSQL connection pool. Services write SQL through `DataSource.query`/`transaction` with parameters
 * only; there are no entities, and the schema lives in the migrations alone.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        ssl: configService.get<string>('DATABASE_SSL') === 'true' ? { rejectUnauthorized: true } : false,
        extra: { max: configService.getOrThrow<number>('DATABASE_POOL_MAX') },
        autoLoadEntities: false,
        synchronize: false,
        migrationsRun: false,
        migrations: DATABASE_MIGRATIONS,
        retryAttempts: DATABASE_RETRY_ATTEMPTS,
        retryDelay: DATABASE_RETRY_DELAY_MS,
      }),
    }),
  ],
})
export class DatabaseModule {}
