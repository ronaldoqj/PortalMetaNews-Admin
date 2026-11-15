# Portal Meta News — Claude Code Guidelines

Portal Meta News is a bilingual (Portuguese and English) news portal with an administrative panel: the newsroom writes,
translates, reviews and publishes news (by hand or with an AI writer), curates the front page, manages media, sections,
tags, themes and the team. Published content only in the languages it was published in, permissions checked by the API
on every call and no tracking of readers are core invariants, not optional features.

This file is the lean context: the rules that apply everywhere and one line per area. The full rules of each area live
in `docs/architecture/` (English) and the guides for people in `docs/` (Portuguese); both are published in the panel's
"Documentação" page, so they are read and reviewed where the product is used. **Read the area's document before changing
it, and update it in the same change.**

## Synchronization Rule

Regra de Sincronização: sempre que uma diretriz de segurança, arquitetura, estilo ou contexto for adicionada, modificada
ou removida nas instruções do Copilot (`.github/`), atualize imediatamente este `CLAUDE.md` (e vice-versa), garantindo
total consistência entre os assistentes.

## Living documentation

- Every feature is documented while it is built: its rules in `docs/architecture/<area>.md`, its guide in
  `docs/<assunto>.md`, both listed in `DOCUMENTATION.md`, the index that feeds the panel (`docs/documentacao-no-painel.md`).
- `scripts/sync-docs.mjs` copies the indexed documents to `apps/frontend/content/docs` (committed; `npm run dev` keeps it
  current); edit the original, never the copy. `scripts/api-routes.mjs` regenerates `docs/architecture/api-routes.md`
  from the controllers; never edit it by hand.
- Keep this file lean: a rule that needs more than two lines belongs in its area's document, with one line here.
- When the user says `LOG.md`, they mean [DEVELOPMENT-HISTORY.md](DEVELOPMENT-HISTORY.md); open decisions and work left
  for later live in [PENDENCIAS.md](PENDENCIAS.md).

## Development

- Node.js `24.20.0` (`.nvmrc`, run `nvm use`) and npm `11.19.0` or newer. Exactly two independently runnable projects,
  `apps/frontend` and `apps/backend`; there is no root `package.json`.
- Local ports end in `27` and are defined once in the root `.env`: site/panel `3027`, API `30027`, PostgreSQL `5427`
  (`README-DEV-PORTS.md`). Never hardcode a port elsewhere.
- PostgreSQL 17 runs only through `apps/backend/compose.yaml`; never depend on a host-installed database.
- Test accounts come from the demo seed and live in the Git-ignored `apps/backend/.env.demo-seed` (model in
  `.env.demo-seed.example`). Use them to verify changes in the running application; never copy their values anywhere.
- Build checks must not disturb a running `npm run dev`: build the frontend with `PMN_PREVIEW=1` (output `.next-preview`).
- Every stored file (media, brand images, profile photos) goes through `StorageService`, in the bucket (`STORAGE_DRIVER=s3`);
  the repository keeps only the default brand images and the docs. The portal covers technology news.
- Full rules (seed, migrations, images, health checks, test helpers): `docs/architecture/development.md`.

## Architecture

- `apps/backend`: modular NestJS API on PostgreSQL through TypeORM's `DataSource` (parameterized SQL, no entities),
  strict TypeScript, ESM. Infrastructure under `src/common` (access, ai, audit, database, i18n, mail, rich-text, secrets,
  storage); features under `src/modules` (newsroom, ai-writer, site, team, settings, dashboard, public).
- `apps/frontend`: Next.js 16 App Router, Mantine 7, next-intl, strict TypeScript. Route groups `(site)` and `(panel)` own
  the news site (bare domain) and the panel (`painel.` host); the API answers on `api.` (`docs/architecture/hosts-and-domains.md`).
- The browser never calls the API: only the frontend's server does, through `BACKEND_INTERNAL_URL`. The frontend's
  `/media`, `/brand-assets`, `/authors-avatar`, `/feed`, `/sitemap.xml` and `/<locale>/api/...` routes are its relays.
- One schema (`public`), consolidated in versioned migrations (`common/database/migrations`); the API applies pending
  migrations before it listens. UPDATE/DELETE through `manager.query` answer `[rows, count]` (`common/database/sql.ts`).
- Themes (`docs/architecture/themes-and-branding.md`): a theme is a complete set of tokens (palettes for both schemes,
  fields, typography, radius, site layout); the site and the panel each render the theme activated for them as CSS
  variables during SSR. Never give a component a fixed colour or name a typeface.

## Product rules

- News (`docs/architecture/newsroom.md`): bilingual fields `{ pt?, en? }`; an item is published in the languages
  chosen for it, each needing title, body and slug; the workflow is draft → review → scheduled/published → archived;
  reporters edit their own items until publication, `news:edit_all` edits any, only `news:publish` publishes.
- Article bodies are canonical HTML of one strict grammar (`common/rich-text/article-html.ts`, mirrored by
  `components/forms/article-html.ts`), rendered as React elements by `ArticleBody`, never injected. AI output goes
  through `lenientArticleHtml`.
- Bilingual sync: the builder translates the source language into the other while sync is on; typing in the target
  pauses it; resuming re-translates everything (`docs/architecture/newsroom.md`).
- AI (`docs/architecture/ai-writer.md`): the provider is Gemini with a key (panel or `GEMINI_API_KEY`), else the
  deterministic local provider in development; prompts live in `common/ai/prompts.ts`, with the chosen editorial style (`ai_styles`, one default).
- The site (`docs/architecture/public-site.md`) shows published content only, counts reads per day without any trace of
  the reader, and keeps a language's URLs in that language.

## Security and privacy

- Business data (news, media, accounts) is not encrypted at rest (deliberate: this is not a whistleblowing channel).
  Integration credentials (SMTP password, AI key) are, by `SecretCipher` (AES-256-GCM from `APP_SECRET_KEY`), and are
  write-only in the interface.
- Derive the actor from the session; every endpoint declares `@RequirePermissions` (deny by default) and every service
  checks again with `requirePermission`. The interface only hides.
- Passwords are Argon2id hashes; sessions are opaque random tokens stored hashed, carried in an HttpOnly host-only
  cookie; temporary passwords force a change on first access; at least one enabled account keeps `users:manage`.
- `audit_logs` is append-only; record actor, action, resource and outcome, never article text, messages or credentials.
- Uploads: detect the type from content, re-encode images (no EXIF/GPS survives), random keys, private store, served
  only through relays with `nosniff` and a sandboxing CSP. Never log file contents, prompts or AI answers.
- Readers: no IP, User-Agent, cookie identifier or third-party script; forms anyone may post have a honeypot and shared
  budgets (`FormProtectionService`). Details: `.github/instructions/security-and-privacy.instructions.md`.

## Frontend conventions (summary; full rules in `docs/architecture/frontend-conventions.md`)

- Data access goes through `panelApi` (`components/admin/api-call.ts`, server-only) and server actions that return an
  `ApiResult`; contracts are zod schemas beside the feature. A `"use server"` module never exports a function that
  takes an API path; writes are one line over `saveResource`/`removeResource`/`actOnResource` (`components/admin/resource.ts`).
- Screens are thin compositions of `@/components/ui` (`Page`, `Section`, `DataView`, `AutoForm`/`FormModal`,
  `ResourceManager`, `useConfirmation`, `useApiAction`, `useFormat`…). Reuse a piece or add the missing one to the library.
- Every list offers rows and cards (`DataView` + `useListingView`, columns placed on the card with `card`), animated on
  switching; never a hand-made table or card grid (`docs/architecture/frontend-conventions.md`).
- Every modal is the shared `Modal`; every destructive action asks through `useConfirmation`; a 404 in a server page
  returns `<PageNotFound />`; every folder with pages has a `loading.tsx`.
- Menus and breadcrumbs of the panel are data in `components/layout/area-navigation.ts`.

## Internationalization (summary; full rules in `docs/architecture/i18n.md`)

- Locales `pt` (Brazilian Portuguese) and `en`, both complete, as route prefixes. Catalogs are split in parts under
  `apps/frontend/messages/<locale>/`; a namespace lives in exactly one part and both languages stay in parity.
- All user-facing text and every localized path come from the catalogs and `i18n/routing.ts`; never build a namespace
  from data. The site's browser receives only its namespaces (`i18n/client-messages.ts`).

## Review checklist

Before completing a relevant change, verify:

1. The API checks the permission again, and the item-level rule (own item, status) where it applies.
2. The site shows only published content, in the languages it was published in, and reads nothing about the reader.
3. No secret, prompt, AI answer or article text reaches a log, an audit record or an error message.
4. Both languages have the new messages; the area's documents, `DOCUMENTATION.md` and `api-routes.md` reflect the change.
5. Backend `npm test` and `npm run test:database`, frontend `npm test`, `npx tsc --noEmit` and lint pass.
