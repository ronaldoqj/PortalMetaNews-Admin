import { ValidationPipe } from '@nestjs/common';

/** The API's request validation: unknown fields are refused and payloads become their DTOs. Tests serve HTTP with it too. */
export function requestValidation(): ValidationPipe {
  return new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true });
}
