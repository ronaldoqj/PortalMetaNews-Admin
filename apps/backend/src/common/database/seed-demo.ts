import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { CategoriesService } from '../../modules/newsroom/categories.service.js';
import { FrontPageService } from '../../modules/newsroom/front-page.service.js';
import { NewsService } from '../../modules/newsroom/news.service.js';
import { TagsService } from '../../modules/newsroom/tags.service.js';
import { hashAdminPassword } from '../access/access.service.js';
import { bootstrapAccount } from '../access/first-administrator.js';
import { isStrongAdminPassword } from '../access/password-policy.js';
import { PERMISSIONS, SYSTEM_ROLES, type Actor, type Permission } from '../access/permissions.js';
import { AiStylesService } from '../ai/ai-styles.service.js';
import { LocalProvider } from '../ai/local-provider.js';
import { MEDIA_VARIANT_NAMES, mediaVariantKey, mediaVariantMimeType, renderMediaImage } from '../storage/media-images.js';
import { mediaFolder } from '../storage/storage-layout.js';
import { StorageService } from '../storage/storage.service.js';
import { SEED_AI_STYLES, SEED_ARTICLES as ARTICLES, SEED_CATEGORIES as CATEGORIES, SEED_FRONT_PAGE_SECTIONS, type SeedArticle } from './seed-demo-content.js';
import { commonsCredit, fetchCommonsPhoto } from './seed-photos.js';

/**
 * Development seed (`npm run db:seed:demo`): the editorial team of a technology news portal, its sections, tags and
 * sixteen fictitious bilingual news items (`seed-demo-content.ts`), one published in Portuguese only, one waiting for
 * review and one scheduled, plus two weeks of reading history, the front page and three editorial styles for the AI
 * writer. Covers are real, openly licensed photographs fetched from Wikimedia Commons (`seed-photos.ts`) and stored
 * like any upload, in the configured store (the bucket, with `STORAGE_DRIVER=s3`); offline, the local provider's
 * placeholder stands in. Every account comes from the Git-ignored `.env.demo-seed`; no AI model is called. Refuses to
 * run in production.
 */

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function bodyHtml(version: SeedArticle['pt']): string {
  const paragraphs = version.body.map((paragraph) => `<p>${escape(paragraph)}</p>`);
  if (version.heading && paragraphs.length > 2) paragraphs.splice(2, 0, `<h2>${escape(version.heading)}</h2>`);
  if (version.quote) paragraphs.splice(1, 0, `<blockquote><p>${escape(version.quote)}</p></blockquote>`);
  return paragraphs.join('');
}

if (process.env.NODE_ENV === 'production') {
  console.error('The demo seed never runs in production.');
  process.exit(1);
}
const account = bootstrapAccount(process.env);
const teamPassword = process.env.SEED_TEAM_PASSWORD ?? '';
if (!account || !isStrongAdminPassword(teamPassword)) {
  console.error('Fill .env.demo-seed (from .env.demo-seed.example) with ADMIN_BOOTSTRAP_* and a strong SEED_TEAM_PASSWORD.');
  process.exit(1);
}

const application = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
const database = application.get(DataSource);
const storage = application.get(StorageService);
try {
  const roles: Array<{ id: string; slug: string; name: string }> = await database.query('SELECT id, slug, name FROM public.roles WHERE is_system');
  const role = (slug: string) => roles.find((candidate) => candidate.slug === slug)!;
  const people = {
    admin: { name: account.name, email: account.email, password: account.password, role: 'admin', job: { pt: 'Diretora de redação', en: 'Editor-in-chief' } },
    editor: { name: 'Marina Duarte', email: 'editor@seed.metanews.test', password: teamPassword, role: 'editor', job: { pt: 'Editora executiva', en: 'Managing editor' } },
    reporter: { name: 'Rafael Nogueira', email: 'reporter@seed.metanews.test', password: teamPassword, role: 'reporter', job: { pt: 'Repórter', en: 'Reporter' } },
    reviewer: { name: 'Lívia Campos', email: 'reviewer@seed.metanews.test', password: teamPassword, role: 'reviewer', job: { pt: 'Revisora', en: 'Copy editor' } },
  } as const;
  const actors = {} as Record<keyof typeof people, Actor>;
  for (const [key, person] of Object.entries(people) as Array<[keyof typeof people, (typeof people)[keyof typeof people]]>) {
    const [existing]: Array<{ id: string }> = await database.query('SELECT id FROM public.users WHERE email = $1', [person.email]);
    const id = existing?.id ?? randomUUID();
    if (!existing) {
      await database.query(`INSERT INTO public.users (id, name, email, password_hash, role_id, job_title, bio) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [
        id, person.name, person.email, await hashAdminPassword(person.password), role(person.role).id, JSON.stringify(person.job),
        JSON.stringify({ pt: `${person.name} integra a redação do Portal Meta News.`, en: `${person.name} is part of the Portal Meta News newsroom.` }),
      ]);
    }
    actors[key] = {
      userId: id, email: person.email, name: person.name, avatarVersion: null, roleId: role(person.role).id, roleName: role(person.role).name, roleSlug: person.role,
      permissions: [...(person.role === 'admin' ? PERMISSIONS : SYSTEM_ROLES[person.role as keyof typeof SYSTEM_ROLES])] as Permission[],
    };
  }
  const admin = actors.admin;

  if (process.env.SEED_RESET_CONTENT === '1') {
    const media: Array<{ id: string }> = await database.query('SELECT id FROM public.media');
    await database.query(`UPDATE public.settings SET front_page = '{"headline":null,"highlights":[],"sections":[]}'::jsonb WHERE singleton`);
    await database.query('DELETE FROM public.ai_conversations');
    await database.query('DELETE FROM public.news');
    await database.query('DELETE FROM public.tags');
    await database.query('DELETE FROM public.categories');
    await database.query('DELETE FROM public.media');
    for (const { id } of media) await storage.deletePrefix(mediaFolder(id)).catch(() => undefined);
  }

  // Editorial styles for the AI writer, only while the newsroom has none of its own.
  const styles = application.get(AiStylesService);
  if (!(await styles.list(admin)).length) for (const style of SEED_AI_STYLES) await styles.create(admin, style);

  const categories = application.get(CategoriesService);
  const existingCategories = await categories.list(admin);
  const categoryIds = new Map<string, string>(existingCategories.map((category) => [category.name.pt ?? '', category.id]));
  for (const category of CATEGORIES) {
    if (!categoryIds.has(category.name.pt)) categoryIds.set(category.name.pt, (await categories.create(admin, { ...category })).id);
  }

  const tags = application.get(TagsService);
  const news = application.get(NewsService);
  const placeholder = new LocalProvider(0);
  const created: Array<{ id: string; featured: boolean; published: boolean }> = [];
  for (const [index, article] of ARTICLES.entries()) {
    const photo = await fetchCommonsPhoto(article.photo);
    const image = photo ?? (await placeholder.image({ prompt: article.pt.title })).data;
    const rendered = await renderMediaImage(image, 40 * 1024 * 1024);
    const mediaId = randomUUID();
    for (const variant of MEDIA_VARIANT_NAMES) {
      await storage.uploadRawObject(mediaVariantKey(mediaId, variant), rendered.variants[variant], mediaVariantMimeType(variant), rendered.variants[variant].length);
    }
    await database.query(`INSERT INTO public.media (id, source, width, height, color, bytes, title, alt, caption, credit, created_by)
      VALUES ($1, 'upload', $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)`, [
      mediaId, rendered.width, rendered.height, rendered.color, rendered.bytes, article.pt.title, JSON.stringify(article.caption), JSON.stringify(article.caption),
      photo ? commonsCredit(article.photo) : 'Ilustração de demonstração', admin.userId,
    ]);
    if (!photo) console.warn(`Cover photo unavailable, placeholder used: ${article.photo.file}`);
    const tagIds = await database.transaction((manager) => tags.ensure(manager, article.tags));
    const locales = article.ptOnly ? ['pt'] : ['pt', 'en'];
    const version = (locale: 'pt' | 'en') => (article.ptOnly && locale === 'en' ? undefined : article[locale]);
    // Reviewers do not write news: their items are created by the administrator and signed by them.
    const creator = article.author === 'reviewer' ? admin : actors[article.author];
    const item = await news.create(creator, {
      authorId: actors[article.author].userId,
      title: Object.fromEntries((['pt', 'en'] as const).flatMap((locale) => version(locale) ? [[locale, version(locale)!.title]] : [])),
      subtitle: Object.fromEntries((['pt', 'en'] as const).flatMap((locale) => version(locale) ? [[locale, version(locale)!.subtitle]] : [])),
      body: Object.fromEntries((['pt', 'en'] as const).flatMap((locale) => version(locale) ? [[locale, bodyHtml(version(locale)!)]] : [])),
      categoryId: categoryIds.get(article.category), coverMediaId: mediaId, coverCaption: article.ptOnly ? { pt: article.caption.pt } : article.caption,
      tagIds, locales, featured: article.featured ?? false, breaking: article.breaking ?? false,
      translation: { enabled: !article.ptOnly, source: 'pt' },
    });
    if (article.status === 'review') {
      await news.transition(actors[article.author], item.id, 'submit');
    } else if (article.status === 'scheduled') {
      await news.transition(admin, item.id, 'schedule', new Date(Date.now() - article.hoursAgo * 3_600_000).toISOString());
    } else {
      await news.transition(admin, item.id, 'publish');
      await database.query(`UPDATE public.news SET published_at = now() - make_interval(hours => $2), updated_at = now() - make_interval(hours => $2)
        WHERE id = $1`, [item.id, article.hoursAgo]);
      // Two weeks of reads, deterministic and decreasing with age, so the dashboard and "most read" have something to show.
      for (let day = 0; day < 14; day += 1) {
        const views = Math.max(0, Math.round((180 - index * 11) * Math.exp(-day / 5) + ((index * 37 + day * 13) % 23)));
        if (views) {
          await database.query(`INSERT INTO public.news_views (news_id, day, views) VALUES ($1, current_date - $2::int, $3)
            ON CONFLICT (news_id, day) DO UPDATE SET views = EXCLUDED.views`, [item.id, day, views]);
        }
      }
      await database.query('UPDATE public.news SET views = (SELECT coalesce(sum(views), 0) FROM public.news_views WHERE news_id = $1) WHERE id = $1', [item.id]);
    }
    created.push({ id: item.id, featured: article.featured ?? false, published: !article.status });
    console.info(`News ${index + 1}/${ARTICLES.length}: ${article.pt.title}`);
  }

  const featured = created.filter((item) => item.published && item.featured).map((item) => item.id);
  await application.get(FrontPageService).update(admin, {
    headline: featured[0] ?? null, highlights: featured.slice(1, 5),
    sections: SEED_FRONT_PAGE_SECTIONS.map((name) => categoryIds.get(name)!).filter(Boolean),
  });
  console.info(`Seed complete: ${created.length} news items, ${CATEGORIES.length} sections, 4 accounts.`);
} catch (error) {
  console.error(`Seed failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await application.close();
}
