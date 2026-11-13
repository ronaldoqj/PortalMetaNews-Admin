import { afterAll, beforeAll, expect, it } from 'vitest';
import { createNewsroom, type Newsroom } from '../../../test/support/newsroom.js';
import { describeWithDatabase } from '../../../test/support/test-database.js';

const MEDIA_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64');

describeWithDatabase('newsroom (database)', () => {
  let room: Newsroom;
  beforeAll(async () => { room = await createNewsroom(); }, 60_000);
  afterAll(async () => { await room?.close(); });

  it('lets a reporter write and submit, but only an editor publish, and shows it on the site in its languages only', async () => {
    const reporter = room.api('reporter');
    const category = await room.api('editor').post('/panel/categories').send({ name: { pt: 'Política', en: 'Politics' } }).expect(201);
    expect(category.body.slug).toEqual({ pt: 'politica', en: 'politics' });
    const draft = await reporter.post('/panel/news').send({}).expect(201);
    const id = draft.body.id as string;
    const saved = await reporter.patch(`/panel/news/${id}`).send({
      title: { pt: 'Câmara aprova orçamento' }, subtitle: { pt: 'Votação foi rápida' },
      body: { pt: '<p>O texto <strong>passou</strong>.</p><script>x</script>' }, categoryId: category.body.id, locales: ['pt'],
    }).expect(400);
    expect(saved.body.code).toBe('body_invalid');
    const ok = await reporter.patch(`/panel/news/${id}`).send({
      title: { pt: 'Câmara aprova orçamento' }, subtitle: { pt: 'Votação foi rápida' },
      body: { pt: '<p>O texto <strong>passou</strong>.</p>' }, categoryId: category.body.id, locales: ['pt'], expectedUpdatedAt: draft.body.updatedAt,
    }).expect(200);
    expect(ok.body.slug).toEqual({ pt: 'camara-aprova-orcamento' });
    await reporter.patch(`/panel/news/${id}`).send({ title: { pt: 'Outro' }, expectedUpdatedAt: draft.body.updatedAt }).expect(409);
    await reporter.post(`/panel/news/${id}/status`).send({ action: 'publish' }).expect(403);
    await reporter.post(`/panel/news/${id}/status`).send({ action: 'submit' }).expect(200);
    // In review, still the reporter's own item; a reviewer (edit_all) may correct it, never publish.
    await room.api('reviewer').patch(`/panel/news/${id}`).send({ subtitle: { pt: 'Votação foi rápida e unânime' } }).expect(200);
    await room.api('reviewer').post(`/panel/news/${id}/status`).send({ action: 'publish' }).expect(403);
    const published = await room.api('editor').post(`/panel/news/${id}/status`).send({ action: 'publish' }).expect(200);
    expect(published.body.status).toBe('published');
    // Once published, the reporter may no longer change it.
    await reporter.patch(`/panel/news/${id}`).send({ title: { pt: 'X' } }).expect(403);

    const site = room.api(null);
    const article = await site.get('/public/news/by-slug/camara-aprova-orcamento?locale=pt').expect(200);
    expect(article.body).toMatchObject({ title: 'Câmara aprova orçamento', body: '<p>O texto <strong>passou</strong>.</p>', alternates: { pt: 'camara-aprova-orcamento' } });
    await site.get('/public/news/by-slug/camara-aprova-orcamento?locale=en').expect(404);
    expect((await site.get('/public/news?locale=pt&q=orcamento').expect(200)).body.total).toBe(1);
    expect((await site.get('/public/news?locale=en').expect(200)).body.total).toBe(0);
    await site.post(`/public/news/${id}/view`).expect(204);
    expect((await room.api('editor').get(`/panel/news/${id}`).expect(200)).body.views).toBe(1);
    expect((await room.api('editor').get(`/panel/news/${id}/revisions`).expect(200)).body.length).toBeGreaterThanOrEqual(2);
  });

  it('refuses to publish a language that is not complete, and keeps slugs unique', async () => {
    const editor = room.api('editor');
    const first = await editor.post('/panel/news').send({ title: { pt: 'Mesmo título' }, body: { pt: '<p>a</p>' }, locales: ['pt', 'en'] }).expect(201);
    const refused = await editor.post(`/panel/news/${first.body.id}/status`).send({ action: 'publish' }).expect(400);
    expect(refused.body).toMatchObject({ code: 'news_incomplete', missing: ['en.title', 'en.body', 'en.slug'] });
    const second = await editor.post('/panel/news').send({ title: { pt: 'Mesmo título' } }).expect(201);
    expect(second.body.slug.pt).toBe('mesmo-titulo-2');
    await editor.post(`/panel/news/${first.body.id}/status`).send({ action: 'schedule', scheduledAt: new Date(Date.now() - 60_000).toISOString() }).expect(400);
  });

  it('translates with the local provider, keeping the article grammar', async () => {
    const answer = await room.api('reporter').post('/panel/translate').send({
      from: 'pt', to: 'en', fields: { title: { text: 'Olá', format: 'plain' }, body: { text: '<p>Um <em>texto</em></p>', format: 'html' } },
    }).expect(200);
    expect(answer.body).toEqual({ fields: { title: '[EN] Olá', body: '<p>[EN] Um <em>texto</em></p>' }, provider: 'local', simulated: true });
  });

  it('keeps media renditions in the store, serves them publicly and refuses to delete a cover in use', async () => {
    const editor = room.api('editor');
    const media = await editor.post('/panel/media').attach('file', MEDIA_PNG, 'pixel.png').field('alt', JSON.stringify({ pt: 'Ponto' })).expect(201);
    expect(room.storage.keysUnder(`media/${media.body.id}/`).sort()).toEqual(['lg', 'md', 'og', 'sm'].map((variant) =>
      `media/${media.body.id}/${variant}.${variant === 'og' ? 'jpg' : 'webp'}`).sort());
    await room.api(null).get(`/public/media/${media.body.id}/md`).expect(200).expect('Content-Type', 'image/webp');
    await editor.post('/panel/news').send({ title: { pt: 'Com capa' }, coverMediaId: media.body.id }).expect(201);
    expect((await editor.delete(`/panel/media/${media.body.id}`).expect(409)).body.code).toBe('media_in_use');
  });

  it('writes, structures and illustrates with the AI writer, and turns the proposal into a draft', async () => {
    const reporter = room.api('reporter');
    const conversation = await reporter.post('/panel/ai-writer/conversations').send({ options: { language: 'pt', image: true } }).expect(201);
    const stream = await reporter.post(`/panel/ai-writer/conversations/${conversation.body.id}/messages`)
      .send({ content: 'A biblioteca reabriu hoje. O prédio foi restaurado. A visita é gratuita. Abre aos sábados.' }).expect(200);
    const events = [...stream.text.matchAll(/^event: (\w+)$/gm)].map((match) => match[1]);
    expect(events[0]).toBe('user');
    expect(events).toEqual(expect.arrayContaining(['delta', 'proposal', 'image', 'done']));
    const thread = await reporter.get(`/panel/ai-writer/conversations/${conversation.body.id}`).expect(200);
    const answer = thread.body.messages.find((message: { role: string }) => message.role === 'assistant');
    expect(answer.proposal.pt.title).toBe('A biblioteca reabriu hoje');
    const applied = await reporter.post(`/panel/ai-writer/messages/${answer.id}/apply`).send({}).expect(200);
    const draft = await reporter.get(`/panel/news/${applied.body.newsId}`).expect(200);
    expect(draft.body).toMatchObject({ status: 'draft', aiAssisted: true, locales: ['pt', 'en'], coverMediaId: answer.mediaIds[0] });
    expect(draft.body.title.en).toBe('[EN] A biblioteca reabriu hoje');
    // Conversations are their author's alone.
    await room.api('editor').get(`/panel/ai-writer/conversations/${conversation.body.id}`).expect(404);
  });

  it('manages themes: activates one on the site and protects system and active themes', async () => {
    const admin = room.api('admin');
    const list = await admin.get('/panel/themes').expect(200);
    const classic = list.body.items.find((theme: { slug: string }) => theme.slug === 'classic');
    const copy = await admin.post('/panel/themes').send({ name: 'Cópia', from: classic.id }).expect(201);
    await admin.patch(`/panel/themes/${copy.body.id}`).send({ tokens: { ...copy.body.tokens, radius: 'huge' } }).expect(400);
    await admin.post(`/panel/themes/${copy.body.id}/activate`).send({ surface: 'site' }).expect(200);
    const site = await room.api(null).get('/public/site').expect(200);
    expect(site.body.themes.site).toEqual(copy.body.tokens);
    expect((await admin.delete(`/panel/themes/${copy.body.id}`).expect(409)).body.code).toBe('theme_active');
    expect((await admin.delete(`/panel/themes/${classic.id}`).expect(409)).body.code).toBe('theme_system');
    await room.api('editor').get('/panel/themes').expect(403);
  });

  it('never lets the last account with access management lose it', async () => {
    const admin = room.api('admin');
    const roles = (await admin.get('/panel/team/roles').expect(200)).body as Array<{ id: string; slug: string }>;
    await admin.patch(`/panel/team/users/${room.ids.admin}`).send({ roleId: roles.find((role) => role.slug === 'editor')!.id }).expect(403);
    await room.api('editor').get('/panel/team/users').expect(403);
    await room.api(null).get('/panel/news').expect(401);
  });
});
