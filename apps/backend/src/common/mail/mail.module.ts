import { Global, Module } from '@nestjs/common';
import { EmailSettingsService } from './email-settings.service.js';
import { MailService } from './mail.service.js';

@Global()
@Module({
  providers: [MailService, EmailSettingsService],
  exports: [MailService, EmailSettingsService],
})
export class MailModule {}
