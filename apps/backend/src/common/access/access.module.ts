import { Global, Module } from '@nestjs/common';
import { AccessController, PermissionGuard, SessionGuard } from './access.controller.js';
import { AccessService } from './access.service.js';

/** Global, so every feature module guards its routes with the same session and permission checks. */
@Global()
@Module({
  controllers: [AccessController],
  providers: [AccessService, SessionGuard, PermissionGuard],
  exports: [AccessService, SessionGuard, PermissionGuard],
})
export class AccessModule {}
