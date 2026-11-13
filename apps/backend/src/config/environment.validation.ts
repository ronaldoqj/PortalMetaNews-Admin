import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, validateSync } from 'class-validator';
import { validateS3Configuration } from '../common/storage/s3-storage.service.js';
import { parseSiteDomain } from './site-hosts.js';

const MIN_PORT = 1;
const MAX_PORT = 65_535;
const optional = (_object: unknown, value: unknown) => value !== undefined && value !== '';
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

/** Every setting of the API, validated at start: a missing or malformed one stops it with the names of the keys (never their values). */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(MIN_PORT)
  @Max(MAX_PORT)
  PORT = 30027;

  @IsString()
  @Matches(/^postgres(?:ql)?:\/\//)
  DATABASE_URL!: string;

  @IsIn(['true', 'false'])
  DATABASE_SSL = 'false';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  DATABASE_POOL_MAX = 10;

  /**
   * 32 random bytes in hexadecimal (`openssl rand -hex 32`): protects only the credentials of the integrations the
   * panel configures (SMTP password, AI provider key). News, media and accounts are never encrypted with it.
   */
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/)
  APP_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  /** The site's domain: the news site on it, the panel on `painel.` and the API on `api.`. */
  @IsString()
  SITE_DOMAIN = 'localhost';

  /** The public origin of the site, used in the links the API writes (feeds, e-mails). Derived in development. */
  @ValidateIf(optional)
  @IsString()
  @Matches(/^https?:\/\/[^/?#]+$/)
  SITE_PUBLIC_URL?: string;

  /** One-time secret the installer types to create the first administrator from the browser; required in production. */
  @ValidateIf(optional)
  @IsString()
  @MinLength(24)
  @MaxLength(256)
  PANEL_SETUP_TOKEN?: string;

  /** Where files are kept: the server's own disk (`local`, the default) or an S3-compatible bucket (`s3`). */
  @IsIn(['local', 's3'])
  STORAGE_DRIVER = 'local';

  @ValidateIf(optional)
  @IsString()
  @MaxLength(1024)
  STORAGE_LOCAL_DIR?: string;

  /** The largest image a single upload accepts, in megabytes. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  UPLOAD_MAX_MB = 15;

  /** The server's own Gemini key, used while the panel stores none. */
  @ValidateIf(optional)
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  GEMINI_API_KEY?: string;

  @ValidateIf(optional)
  @IsString()
  @Matches(MODEL)
  GEMINI_TEXT_MODEL?: string;

  @ValidateIf(optional)
  @IsString()
  @Matches(MODEL)
  GEMINI_IMAGE_MODEL?: string;

  /** Whether this instance publishes scheduled news. Turn it off on replicas that should only serve requests. */
  @IsIn(['true', 'false'])
  SCHEDULER = 'true';
}

export function validateEnvironment(configuration: Record<string, unknown>): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, configuration, { enableImplicitConversion: true });
  const errors = validateSync(environment, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.map(({ property }) => property).join(', ')}`);
  }
  try {
    parseSiteDomain(environment.SITE_DOMAIN);
  } catch {
    throw new Error('Invalid environment configuration: SITE_DOMAIN');
  }
  if (environment.STORAGE_DRIVER === 's3') validateS3Configuration({ ...configuration, NODE_ENV: environment.NODE_ENV });
  return environment;
}
