import { applyDecorators, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { PanelErrorFilter, PermissionGuard, PrivateResponse, SessionGuard } from '../common/access/access.controller.js';

/**
 * What every controller of the panel carries: the session, the permission check (deny by default: each handler
 * declares `@RequirePermissions`), private answers and refusals that never leak a cause.
 */
export const PanelController = () => applyDecorators(
  UseGuards(SessionGuard, PermissionGuard), UseFilters(PanelErrorFilter), UseInterceptors(PrivateResponse),
);
