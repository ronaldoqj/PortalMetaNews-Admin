import { Controller, Get, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CurrentUser, RequirePermissions } from '../../common/access/access.controller.js';
import { hasPermission, type Actor } from '../../common/access/permissions.js';
import { PanelController } from '../panel-controller.js';
import { DashboardService } from './dashboard.service.js';

@Controller('panel')
@PanelController()
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboard: DashboardService,
    @Inject(DataSource) private readonly database: DataSource,
  ) {}

  @Get('dashboard') @RequirePermissions('news:read')
  overview(@CurrentUser() actor: Actor) {
    return this.dashboard.overview(actor);
  }

  /** The counters of the menu: items waiting for review and readers' messages not yet read. */
  @Get('badges') @RequirePermissions()
  async badges(@CurrentUser() actor: Actor) {
    const [row]: Array<{ review: number; messages: number }> = await this.database.query(`SELECT
      (SELECT count(*)::int FROM public.news WHERE status = 'review') AS review,
      (SELECT count(*)::int FROM public.contact_messages WHERE status = 'new') AS messages`);
    return {
      review: hasPermission(actor, 'news:publish') || hasPermission(actor, 'news:edit_all') ? row.review : 0,
      messages: hasPermission(actor, 'contacts:read') ? row.messages : 0,
    };
  }
}
