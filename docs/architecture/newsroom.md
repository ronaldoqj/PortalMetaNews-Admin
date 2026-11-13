# Newsroom

Rules of the panel's newsroom: news, the bilingual builder and its translation sync, the editorial workflow, revisions,
media, sections, tags, the front page and the dashboard. Guide: [Redação e notícias](../redacao-e-noticias.md).

## Data and API

- One table `news` holds both languages per field (`title`, `subtitle`, `body`, `slug`, `seo_*`, `cover_caption` as
  `{ pt?, en? }`); `locales` lists the languages the item is published in, `translation` (`{ enabled, source }`) the
  builder's sync state. Bodies are stored only as canonical article HTML (`common/rich-text/article-html.ts`, mirrored by
  `components/forms/article-html.ts`); `body_text` and the generated `search_pt`/`search_en` vectors come from them.
- Statuses `draft → review → scheduled | published → archived`, moved only through `POST panel/news/:id/status`
  (`submit`, `return`, `publish`, `schedule`, `unpublish`, `archive`, `restore`). Publishing or scheduling requires every
  language in `locales` to have title, body and slug (`news_incomplete`, `news_no_locale`); a live item stays publishable on
  every save. `NewsSchedulerService` publishes due items every 30 s (`SCHEDULER=false` turns it off on a replica).
- Permissions per item, computed by the API and returned as `permissions` on every view and list row: `edit` =
  `news:edit_all`, or `news:write` on one's own item while `draft`/`review`; `publish` = `news:publish`; `delete` =
  `news:delete` and not published. The UI only hides; the API refuses (403/409) whatever the UI shows.
- Saves are partial `PATCH` with `expectedUpdatedAt`: a newer save by someone else answers `409 news_conflict` and is never
  overwritten. Each save that changes content stores a snapshot in `news_revisions` (the newest 50 kept); restoring
  applies a snapshot as a new save (`reason: restore`).
- Slugs: generated from the title while the item is not live, unique per language (`-2`, `-3`...); a live item keeps its
  slug unless the editor types a new one.
- Media: renditions only (`sm`/`md`/`lg` WebP, `og` 1200×630 JPEG), metadata stripped, served by the frontend relay
  `/media/<id>/<size>`; an item used as a cover or inside a body (`/media/<id>/` in any body) cannot be deleted
  (`409 media_in_use`). AI images are generated through `AiService` and stored with `source = 'ai'` and their prompt.
- Sections cannot be deleted while they hold news (`category_in_use`); their order (`PUT panel/categories/order`) is the
  site's menu order. Tags are created by `taxonomy:manage` or `news:write`.
- The front page (`settings.front_page`) pins only published news (`front_page_unpublished`); empty slots are filled by
  the public API (featured, then newest).

## Frontend

- Screens live in `components/newsroom` (list, builder, media, taxonomy, front page) and `components/dashboard`; data
  comes from `panelApi` with the zod contracts of `components/newsroom/contracts.ts`, which mirror the API views exactly;
  mutations are the fixed-path server actions of `components/newsroom/actions.ts`.
- The body editor is `components/ui/forms/article-editor.tsx` (Tiptap through `@mantine/tiptap`), configured to write only
  the article grammar: H2/H3, marks, lists, quote, separator, http(s)/mailto links and media library images inserted as
  `<img src="/media/<id>/lg" alt="...">`; pasted images are dropped.
- Translation sync: the rules are pure functions in `translation-sync.ts` (tested), the timing in `use-translation-sync.ts`:
  - editing a field in the source language translates that field after 1.2 s of quiet (`POST panel/translate`, `html` for
    the body, `plain` otherwise); each field has a version and an answer for an older version, or after the source
    changed or sync stopped, is discarded;
  - editing the target language turns sync off (persisted), unless the source language is still entirely empty, in which
    case the edited language becomes the source;
  - resuming translates every field of the chosen source at once and overwrites the target, after a confirmation when the
    target has content;
  - values set by a translation never count as an edit (the editor sets content without emitting updates).
  - Sync runs only while `panel/settings/ai/status` says a provider answers and the account holds `ai:use` and may edit.
- The builder saves only changed fields (`builder-state.ts`, tested), on request, every 20 s, 1.5 s after a field loses
  focus and before any workflow move; it warns on unload with unsaved changes.
- `/noticias/nova` creates the draft from the browser (never during render or prefetch); the "Nova notícia" buttons are a
  form action that creates and redirects.
- Every page folder has a `loading.tsx` (`AdminPageSkeleton`); every text comes from `messages/<locale>/newsroom.json`
  (namespaces `News`, `Builder`, `Media`, `Categories`, `Tags`, `FrontPage`, `Dashboard`).
