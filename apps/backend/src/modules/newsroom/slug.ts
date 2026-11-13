import type { EntityManager } from 'typeorm';
import type { ContentLocale } from '../../common/i18n/locales.js';

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 120;

/** A URL slug of a text: lowercase ASCII words joined by hyphens, accents removed (`Política & Economia` → `politica-economia`). */
export function slugify(text: string, max = SLUG_MAX): string {
  const slug = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  return (cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut).replace(/-+$/, '');
}

/**
 * The first free slug of a table for one language: the wanted one, else with `-2`, `-3`... The partial unique index
 * still decides under concurrency; this only spares the common collision.
 */
export async function uniqueSlug(manager: EntityManager, table: 'news' | 'categories' | 'tags', locale: ContentLocale, wanted: string, exceptId: string | null): Promise<string> {
  const base = wanted.slice(0, SLUG_MAX - 4).replace(/-+$/, '') || 'item';
  const rows: Array<{ slug: string }> = await manager.query(`SELECT slug ->> $1 AS slug FROM public.${table}
    WHERE (slug ->> $1 = $2 OR slug ->> $1 LIKE $2 || '-%') AND ($3::uuid IS NULL OR id <> $3)`, [locale, base, exceptId]);
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
}
