import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { EmailSettingsService } from '../../common/mail/email-settings.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { contactReceivedTemplate } from '../../common/mail/notification-templates.js';
import { canonicalRichText } from '../../common/rich-text/rich-text.js';

/** What a reader writes about: a story tip, a correction, advertising, press, privacy or anything else. */
export const CONTACT_TOPICS = ['tip', 'correction', 'advertising', 'press', 'privacy', 'other'] as const;
export type ContactTopic = typeof CONTACT_TOPICS[number];
export const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactStatus = typeof CONTACT_STATUSES[number];
export const CONTACT_PAGE_SIZE = 20;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 5000;

export interface ContactInput { name: string; email: string; topic: ContactTopic; message: string; locale: 'pt' | 'en' }
export interface ContactQuery { page: number; search?: string; status?: ContactStatus; topic?: ContactTopic }

interface ContactRow {
  id: string; name: string; email: string; topic: ContactTopic; message: string; locale: string; status: ContactStatus;
  created_at: Date; read_at: Date | null; read_by_name: string | null; total?: number;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * The site's contact form. A message is kept for the panel (`contacts:read`) and announced by e-mail to the portal's
 * contact address, without its content. Nothing about the reader's request (IP address, User-Agent) is stored: only
 * what they typed.
 */
@Injectable()
export class ContactMessagesService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(EmailSettingsService) private readonly email: EmailSettingsService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async submit(input: ContactInput): Promise<{ id: string }> {
    const body = canonicalRichText(input.message);
    if (!body || body.text.length < CONTACT_MESSAGE_MIN || body.text.length > CONTACT_MESSAGE_MAX) throw new BadRequestException();
    const name = input.name.trim();
    if (!name) throw new BadRequestException();
    const id = randomUUID();
    await this.database.query(`INSERT INTO public.contact_messages (id, name, email, topic, message, locale) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, input.email.trim().toLowerCase(), input.topic, body.html, input.locale]);
    // The notice by e-mail never delays nor fails the reader's submission: the panel keeps the message.
    void this.announce().catch(() => undefined);
    return { id };
  }

  private async announce() {
    const transport = await this.email.transport();
    if (!transport) return;
    const [settings]: Array<{ contact_email: string | null; site_name: string }> = await this.database.query('SELECT contact_email, site_name FROM public.settings WHERE singleton');
    if (settings?.contact_email) await this.mail.send(transport, settings.contact_email, contactReceivedTemplate(settings.site_name));
  }

  async list(actor: Actor, query: ContactQuery) {
    requirePermission(actor, 'contacts:read');
    const conditions: string[] = [];
    const parameters: unknown[] = [];
    const parameter = (value: unknown) => { parameters.push(value); return `$${parameters.length}`; };
    if (query.search) {
      const term = parameter(`%${escapeLike(query.search)}%`);
      conditions.push(`(c.name ILIKE ${term} OR c.email ILIKE ${term} OR c.message ILIKE ${term})`);
    }
    conditions.push(query.status ? `c.status = ${parameter(query.status)}` : `c.status <> 'archived'`);
    if (query.topic) conditions.push(`c.topic = ${parameter(query.topic)}`);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [{ total }]: Array<{ total: number }> = await this.database.query(`SELECT count(*)::int AS total FROM public.contact_messages c ${where}`, parameters);
    const rows: ContactRow[] = await this.database.query(`SELECT c.*, u.name AS read_by_name FROM public.contact_messages c
      LEFT JOIN public.users u ON u.id = c.read_by ${where} ORDER BY c.created_at DESC, c.id DESC
      LIMIT ${CONTACT_PAGE_SIZE} OFFSET ${parameter((query.page - 1) * CONTACT_PAGE_SIZE)}`, parameters);
    const [{ unread }]: Array<{ unread: number }> = await this.database.query(`SELECT count(*)::int AS unread FROM public.contact_messages WHERE status = 'new'`);
    return { items: rows.map((row) => this.view(row)), total, unread, page: query.page, pageSize: CONTACT_PAGE_SIZE };
  }

  async get(actor: Actor, id: string) {
    requirePermission(actor, 'contacts:read');
    const [row]: ContactRow[] = await this.database.query(`SELECT c.*, u.name AS read_by_name FROM public.contact_messages c
      LEFT JOIN public.users u ON u.id = c.read_by WHERE c.id = $1`, [id]);
    if (!row) throw new NotFoundException();
    return this.view(row);
  }

  /** Moves a message between new, read and archived; the first reader is kept. */
  async setStatus(actor: Actor, id: string, status: ContactStatus) {
    requirePermission(actor, 'contacts:read');
    const row = await this.database.transaction(async (manager) => {
      const [updated]: [ContactRow[], number] = await manager.query(`UPDATE public.contact_messages SET status = $2,
          read_at = CASE WHEN $2 = 'new' THEN NULL ELSE COALESCE(read_at, now()) END,
          read_by = CASE WHEN $2 = 'new' THEN NULL ELSE COALESCE(read_by, $3) END
        WHERE id = $1 RETURNING *`, [id, status, actor.userId]);
      if (!updated[0]) return null;
      await audit(manager, { actorId: actor.userId, action: 'contact.status_changed', resourceType: 'contact_message', resourceId: id, metadata: { status } });
      return updated[0];
    });
    if (!row) throw new NotFoundException();
    return this.view({ ...row, read_by_name: null });
  }

  async unread(): Promise<number> {
    const [{ unread }]: Array<{ unread: number }> = await this.database.query(`SELECT count(*)::int AS unread FROM public.contact_messages WHERE status = 'new'`);
    return unread;
  }

  private view(row: ContactRow) {
    return {
      id: row.id, name: row.name, email: row.email, topic: row.topic, message: row.message, locale: row.locale, status: row.status,
      createdAt: row.created_at.toISOString(), readAt: row.read_at?.toISOString() ?? null, readBy: row.read_by_name,
    };
  }
}
