import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';

export const FRONT_PAGE_LIMITS = { highlights: 4, sections: 8 } as const;

/** The editors' choices for the home page: the headline, up to four highlights and the sections shown as blocks. */
export interface FrontPage {
  headline: string | null;
  highlights: string[];
  sections: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The front page ("capa"): what the editors pin to the top of the home page. Anything left empty is filled by the
 * site automatically (the newest featured items, then the newest ones), so the home page never waits for curation.
 */
@Injectable()
export class FrontPageService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async current(): Promise<FrontPage> {
    const [row]: Array<{ front_page: Partial<FrontPage> }> = await this.database.query('SELECT front_page FROM public.settings WHERE singleton');
    const stored = row?.front_page ?? {};
    return {
      headline: typeof stored.headline === 'string' && UUID.test(stored.headline) ? stored.headline : null,
      highlights: Array.isArray(stored.highlights) ? stored.highlights.filter((id) => UUID.test(id)).slice(0, FRONT_PAGE_LIMITS.highlights) : [],
      sections: Array.isArray(stored.sections) ? stored.sections.filter((id) => UUID.test(id)).slice(0, FRONT_PAGE_LIMITS.sections) : [],
    };
  }

  async view(actor: Actor) {
    requirePermission(actor, 'news:read');
    return this.current();
  }

  async update(actor: Actor, input: FrontPage) {
    requirePermission(actor, 'front_page:manage');
    const news = [...(input.headline ? [input.headline] : []), ...input.highlights];
    if (new Set(news).size !== news.length || input.highlights.length > FRONT_PAGE_LIMITS.highlights || input.sections.length > FRONT_PAGE_LIMITS.sections
      || new Set(input.sections).size !== input.sections.length) {
      throw new BadRequestException({ statusCode: 400, message: 'Invalid front page', code: 'front_page_invalid' });
    }
    await this.database.transaction(async (manager) => {
      const published: Array<{ id: string }> = news.length
        ? await manager.query(`SELECT id FROM public.news WHERE id = ANY($1::uuid[]) AND status = 'published'`, [news]) : [];
      if (published.length !== news.length) throw new BadRequestException({ statusCode: 400, message: 'Only published news can be pinned', code: 'front_page_unpublished' });
      const categories: Array<{ id: string }> = input.sections.length
        ? await manager.query('SELECT id FROM public.categories WHERE id = ANY($1::uuid[])', [input.sections]) : [];
      if (categories.length !== input.sections.length) throw new BadRequestException({ statusCode: 400, message: 'Unknown section', code: 'front_page_invalid' });
      await manager.query('UPDATE public.settings SET front_page = $1::jsonb, updated_at = now(), updated_by = $2 WHERE singleton',
        [JSON.stringify({ headline: input.headline, highlights: input.highlights, sections: input.sections }), actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'front_page.updated', metadata: { highlights: input.highlights.length, sections: input.sections.length } });
    });
    return this.current();
  }
}
