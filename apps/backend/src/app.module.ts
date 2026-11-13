import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccessModule } from './common/access/access.module.js';
import { AiModule } from './common/ai/ai.module.js';
import { DatabaseModule } from './common/database/database.module.js';
import { HealthModule } from './common/health/health.module.js';
import { MailModule } from './common/mail/mail.module.js';
import { FormProtectionService } from './common/protection/form-protection.service.js';
import { RobotsModule } from './common/robots/robots.module.js';
import { SecretsModule } from './common/secrets/secrets.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { AiWriterController } from './modules/ai-writer/ai-writer.controller.js';
import { AiWriterService } from './modules/ai-writer/ai-writer.service.js';
import { DashboardController } from './modules/dashboard/dashboard.controller.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { CategoriesService } from './modules/newsroom/categories.service.js';
import { FrontPageService } from './modules/newsroom/front-page.service.js';
import { MediaService } from './modules/newsroom/media.service.js';
import { NewsSchedulerService } from './modules/newsroom/news-scheduler.service.js';
import { NewsService } from './modules/newsroom/news.service.js';
import {
  CategoriesController, FrontPageController, MediaController, NewsController, TagsController, TranslateController,
} from './modules/newsroom/newsroom.controller.js';
import { PublicNewsService } from './modules/newsroom/public-news.service.js';
import { TagsService } from './modules/newsroom/tags.service.js';
import { TranslationService } from './modules/newsroom/translation.service.js';
import { PublicController } from './modules/public/public.controller.js';
import { SettingsController, StorageInfoService } from './modules/settings/settings.controller.js';
import { ContactMessagesService } from './modules/site/contact-messages.service.js';
import { ContactsController, LegalController, SiteIdentityController, ThemesController } from './modules/site/site.controller.js';
import { SiteLegalService } from './modules/site/site-legal.service.js';
import { SiteSettingsService } from './modules/site/site-settings.service.js';
import { ThemesService } from './modules/site/themes.service.js';
import { AuditTrailService } from './modules/team/audit-trail.service.js';
import { AuditController, ProfileController, TeamController } from './modules/team/team.controller.js';
import { TeamService } from './modules/team/team.service.js';

/**
 * The whole API: infrastructure modules (database, access, AI, storage, e-mail, secrets) are global; the feature
 * services and controllers live here, each controller a thin layer over a service that checks permissions again.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true, validate: validateEnvironment }),
    DatabaseModule, SecretsModule, StorageModule, MailModule, AccessModule, AiModule, HealthModule, RobotsModule,
  ],
  controllers: [
    PublicController, DashboardController, NewsController, TranslateController, CategoriesController, TagsController, MediaController,
    FrontPageController, AiWriterController, ThemesController, SiteIdentityController, LegalController, ContactsController,
    TeamController, ProfileController, AuditController, SettingsController,
  ],
  providers: [
    FormProtectionService, SiteSettingsService, ThemesService, SiteLegalService, ContactMessagesService,
    CategoriesService, TagsService, MediaService, NewsService, NewsSchedulerService, TranslationService, FrontPageService, PublicNewsService,
    AiWriterService, TeamService, AuditTrailService, DashboardService, StorageInfoService,
  ],
})
export class AppModule {}
