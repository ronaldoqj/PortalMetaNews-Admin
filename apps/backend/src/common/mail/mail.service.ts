import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import type { MailContent } from './notification-templates.js';
import { deliveryFailureCode, smtpSender, withSmtpTransport, type SmtpTransportSettings } from './smtp-transport.js';

export interface DeliverySummary {
  sent: number;
  failed: number;
}

/**
 * Transactional e-mail over a resolved relay (the operator's or the client's own). Each recipient gets an
 * individual message, so no address is disclosed to another recipient. Logs carry counts and transport error
 * codes only, never addresses, subjects or server replies.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private get production(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /** One message to one address; false when it could not be delivered. `replyTo` lets an answer reach a visitor. */
  async send(transport: SmtpTransportSettings, to: string, content: MailContent & { replyTo?: string }): Promise<boolean> {
    if (!isEmail(to) || (content.replyTo !== undefined && !isEmail(content.replyTo))) return false;
    try {
      await withSmtpTransport(transport, this.production, (transporter) => transporter.sendMail({ from: smtpSender(transport), to, ...content }));
      return true;
    } catch (error) {
      this.logger.warn(`E-mail delivery failed (${deliveryFailureCode(error)})`);
      return false;
    }
  }

  /** The same message to several people, one by one over a single connection. */
  async deliver(transport: SmtpTransportSettings, recipients: readonly string[], content: MailContent): Promise<DeliverySummary> {
    const valid = recipients.filter((recipient) => isEmail(recipient));
    const summary = { sent: 0, failed: recipients.length - valid.length };
    if (!valid.length) return summary;
    await withSmtpTransport(transport, this.production, async (transporter) => {
      for (const to of valid) {
        try {
          await transporter.sendMail({ from: smtpSender(transport), to, ...content });
          summary.sent += 1;
        } catch (error) {
          summary.failed += 1;
          this.logger.warn(`Notification e-mail delivery failed (${deliveryFailureCode(error)})`);
        }
      }
    });
    return summary;
  }
}
