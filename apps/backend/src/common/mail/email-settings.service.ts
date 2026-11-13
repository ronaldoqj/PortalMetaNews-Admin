import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { requirePermission, type Actor } from '../access/permissions.js';
import { audit } from '../audit/audit.js';
import { SecretCipher } from '../secrets/secret-cipher.service.js';
import { MailService } from './mail.service.js';
import { testTemplate } from './notification-templates.js';
import { environmentSmtpSettings, validatePanelSmtp, verifySmtp, type SmtpTransportSettings } from './smtp-transport.js';

const OWNER = 'site';

interface SettingsRow {
  site_name: string; email_enabled: boolean; smtp_host: string | null; smtp_port: number | null; smtp_secure: boolean; smtp_user: string | null;
  smtp_password_encrypted: string | null; smtp_from_email: string | null; smtp_from_name: string | null;
}

export interface EmailSettingsUpdate {
  enabled: boolean;
  host?: string | null; port?: number | null; secure?: boolean; user?: string | null;
  /** Write-only: omitted keeps the stored password, an empty string removes it. */
  password?: string;
  fromEmail?: string | null; fromName?: string | null;
}

/**
 * The portal's outgoing e-mail: the relay saved in the panel (password encrypted by `SecretCipher`, write-only) or,
 * without one, the operator's from the environment (`SMTP_*`). Off until the panel turns it on.
 */
@Injectable()
export class EmailSettingsService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(SecretCipher) private readonly cipher: SecretCipher,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  private get production(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private async row(): Promise<SettingsRow> {
    const [row]: SettingsRow[] = await this.database.query(`SELECT site_name, email_enabled, smtp_host, smtp_port, smtp_secure, smtp_user,
      smtp_password_encrypted, smtp_from_email, smtp_from_name FROM public.settings WHERE singleton`);
    return row;
  }

  private panelRelay(row: SettingsRow): SmtpTransportSettings | null {
    if (!row.smtp_host || !row.smtp_port || !row.smtp_from_email) return null;
    let password: string | undefined;
    if (row.smtp_password_encrypted) {
      try { password = this.cipher.decrypt(row.smtp_password_encrypted, 'smtp-password', OWNER); } catch { return null; }
    }
    return {
      source: 'panel', host: row.smtp_host, port: row.smtp_port, secure: row.smtp_secure, user: row.smtp_user ?? undefined, password,
      from: row.smtp_from_email, fromName: row.smtp_from_name ?? undefined,
    };
  }

  /** The relay that would send now, or null while e-mail is off or nothing is configured. */
  async transport(): Promise<SmtpTransportSettings | null> {
    const row = await this.row();
    if (!row?.email_enabled) return null;
    return this.panelRelay(row) ?? environmentSmtpSettings(this.config);
  }

  async view(actor: Actor) {
    requirePermission(actor, 'settings:manage');
    const row = await this.row();
    const panel = this.panelRelay(row);
    const environment = environmentSmtpSettings(this.config);
    return {
      enabled: row.email_enabled, host: row.smtp_host, port: row.smtp_port, secure: row.smtp_secure, user: row.smtp_user,
      passwordSet: row.smtp_password_encrypted !== null, fromEmail: row.smtp_from_email, fromName: row.smtp_from_name,
      environmentRelay: environment !== null, effective: !row.email_enabled ? null : panel ? 'panel' : environment ? 'environment' : null,
    };
  }

  async update(actor: Actor, input: EmailSettingsUpdate) {
    requirePermission(actor, 'settings:manage');
    const current = await this.row();
    const next = {
      host: input.host === undefined ? current.smtp_host : input.host?.trim() || null,
      port: input.port === undefined ? current.smtp_port : input.port,
      secure: input.secure ?? current.smtp_secure,
      user: input.user === undefined ? current.smtp_user : input.user?.trim() || null,
      fromEmail: input.fromEmail === undefined ? current.smtp_from_email : input.fromEmail?.trim().toLowerCase() || null,
      fromName: input.fromName === undefined ? current.smtp_from_name : input.fromName?.trim() || null,
    };
    if (next.host) {
      const invalid = validatePanelSmtp({ host: next.host, port: next.port, secure: next.secure, user: next.user ?? undefined, from: next.fromEmail, fromName: next.fromName ?? undefined }, this.production);
      if (invalid.length) throw new BadRequestException({ statusCode: 400, message: 'Invalid e-mail settings', code: 'smtp_invalid', fields: invalid });
    }
    const password = input.password === undefined ? current.smtp_password_encrypted
      : input.password ? this.cipher.encrypt(input.password, 'smtp-password', OWNER) : null;
    await this.database.transaction(async (manager) => {
      await manager.query(`UPDATE public.settings SET email_enabled = $1, smtp_host = $2, smtp_port = $3, smtp_secure = $4, smtp_user = $5,
        smtp_password_encrypted = $6, smtp_from_email = $7, smtp_from_name = $8, updated_at = now(), updated_by = $9 WHERE singleton`,
      [input.enabled, next.host, next.port, next.secure, next.user, password, next.fromEmail, next.fromName, actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'settings.email_updated', metadata: { enabled: input.enabled, ownRelay: !!next.host } });
    });
    return this.view(actor);
  }

  /** Connects and authenticates, then sends a test message to the signed-in account. */
  async test(actor: Actor): Promise<{ ok: boolean; code?: string }> {
    requirePermission(actor, 'settings:manage');
    const row = await this.row();
    const relay = this.panelRelay(row) ?? environmentSmtpSettings(this.config);
    if (!relay) return { ok: false, code: 'smtp_unconfigured' };
    try {
      await verifySmtp(relay, this.production);
    } catch {
      return { ok: false, code: 'smtp_unreachable' };
    }
    const sent = await this.mail.send(relay, actor.email, testTemplate(row.site_name));
    return sent ? { ok: true } : { ok: false, code: 'smtp_delivery_failed' };
  }
}
