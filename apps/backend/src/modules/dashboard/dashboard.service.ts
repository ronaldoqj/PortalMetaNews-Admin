import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { hasPermission, requirePermission, type Actor } from '../../common/access/permissions.js';
import type { I18nString } from '../../common/i18n/i18n-string.js';

const TREND_DAYS = 30;
type Localized = Partial<Record<'pt' | 'en', string>>;

/**
 * The panel's overview, from figures the database already holds: how many news are in each status, what was
 * published and read lately, the most read items, the sections that publish most, the account's own work and the
 * readers' messages waiting. Reads are counted per day without any trace of the reader.
 */
@Injectable()
export class DashboardService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async overview(actor: Actor, now = new Date()) {
    requirePermission(actor, 'news:read');
    return this.database.transaction('REPEATABLE READ', async (manager) => {
      const statuses: Array<{ status: string; count: number }> = await manager.query('SELECT status, count(*)::int AS count FROM public.news GROUP BY status');
      const [totals]: Array<{ published_week: number; published_previous_week: number; views_week: number; views_previous_week: number; ai_assisted: number }> = await manager.query(`
        SELECT
          (SELECT count(*)::int FROM public.news WHERE status = 'published' AND published_at > $1::timestamptz - interval '7 days') AS published_week,
          (SELECT count(*)::int FROM public.news WHERE status = 'published' AND published_at <= $1::timestamptz - interval '7 days' AND published_at > $1::timestamptz - interval '14 days') AS published_previous_week,
          (SELECT coalesce(sum(views), 0)::int FROM public.news_views WHERE day > ($1::timestamptz)::date - 7) AS views_week,
          (SELECT coalesce(sum(views), 0)::int FROM public.news_views WHERE day <= ($1::timestamptz)::date - 7 AND day > ($1::timestamptz)::date - 14) AS views_previous_week,
          (SELECT count(*)::int FROM public.news WHERE ai_assisted) AS ai_assisted`, [now]);
      const trend: Array<{ day: string; views: number; published: number }> = await manager.query(`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
          coalesce((SELECT sum(v.views) FROM public.news_views v WHERE v.day = d.day::date), 0)::int AS views,
          (SELECT count(*) FROM public.news n WHERE n.status IN ('published', 'archived') AND n.published_at::date = d.day::date)::int AS published
        FROM generate_series(($1::timestamptz)::date - ${TREND_DAYS - 1}, ($1::timestamptz)::date, interval '1 day') AS d(day) ORDER BY d.day`, [now]);
      const top: Array<{ id: string; title: Localized; views: number; total: string; category: I18nString | null; color: string | null }> = await manager.query(`
        SELECT n.id, n.title, v.views, n.views AS total, c.name AS category, c.color FROM public.news n
        JOIN (SELECT news_id, sum(views)::int AS views FROM public.news_views WHERE day > ($1::timestamptz)::date - 7 GROUP BY news_id) v ON v.news_id = n.id
        LEFT JOIN public.categories c ON c.id = n.category_id ORDER BY v.views DESC LIMIT 5`, [now]);
      const categories: Array<{ id: string; name: I18nString; color: string; count: number }> = await manager.query(`
        SELECT c.id, c.name, c.color, count(n.id)::int AS count FROM public.categories c
        LEFT JOIN public.news n ON n.category_id = c.id AND n.status = 'published' GROUP BY c.id ORDER BY count DESC, c.position LIMIT 8`);
      const mine: Array<{ id: string; title: Localized; status: string; updated_at: Date }> = await manager.query(`
        SELECT id, title, status, updated_at FROM public.news WHERE (author_id = $1 OR created_by = $1) AND status IN ('draft', 'review', 'scheduled')
        ORDER BY updated_at DESC LIMIT 6`, [actor.userId]);
      const review: Array<{ id: string; title: Localized; updated_at: Date; author: string | null }> = hasPermission(actor, 'news:publish') || hasPermission(actor, 'news:edit_all')
        ? await manager.query(`SELECT n.id, n.title, n.updated_at, u.name AS author FROM public.news n LEFT JOIN public.users u ON u.id = n.author_id
          WHERE n.status = 'review' ORDER BY n.updated_at LIMIT 6`) : [];
      const scheduled: Array<{ id: string; title: Localized; scheduled_at: Date }> = await manager.query(
        `SELECT id, title, scheduled_at FROM public.news WHERE status = 'scheduled' ORDER BY scheduled_at LIMIT 6`);
      const [{ unread }]: Array<{ unread: number }> = hasPermission(actor, 'contacts:read')
        ? await manager.query(`SELECT count(*)::int AS unread FROM public.contact_messages WHERE status = 'new'`) : [{ unread: 0 }];
      return {
        statuses: Object.fromEntries(['draft', 'review', 'scheduled', 'published', 'archived'].map((status) => [status, statuses.find((row) => row.status === status)?.count ?? 0])),
        week: {
          published: totals.published_week, publishedPrevious: totals.published_previous_week, views: totals.views_week, viewsPrevious: totals.views_previous_week,
        },
        aiAssisted: totals.ai_assisted, trend,
        top: top.map((row) => ({ id: row.id, title: row.title, views: row.views, total: Number(row.total), category: row.category, color: row.color })),
        categories: categories.map((row) => ({ id: row.id, name: row.name, color: row.color, count: row.count })),
        mine: mine.map((row) => ({ id: row.id, title: row.title, status: row.status, updatedAt: row.updated_at.toISOString() })),
        review: review.map((row) => ({ id: row.id, title: row.title, author: row.author, updatedAt: row.updated_at.toISOString() })),
        scheduled: scheduled.map((row) => ({ id: row.id, title: row.title, scheduledAt: row.scheduled_at.toISOString() })),
        unreadMessages: unread,
      };
    });
  }
}
