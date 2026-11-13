# Development and deployment

Rules of the development environment, the database, tests and production images. Guide: [Implantação](../implantacao.md).

## Environment

- Node.js `24.20.0` (`.nvmrc`) and npm `11.19.0`+. Two independent projects, `apps/backend` and `apps/frontend`, each with its own
  `package.json` and lockfile; there is no root `package.json`.
- Local ports end in `27` and live only in the root `.env` (`FRONTEND_PORT=3027`, `BACKEND_PORT=30027`, `POSTGRES_PORT=5427`).
  `npm run dev` in either project goes through `scripts/dev.mjs`, which requires `NODE_ENV=development`, derives `PORT`,
  `BACKEND_INTERNAL_URL` (frontend) and `CORS_ORIGINS` (backend) from it, and keeps the panel's documentation copy current.
- Local hosts: the site on `localhost:3027`, the panel on `painel.localhost:3027` (every `*.localhost` resolves to 127.0.0.1),
  the API on `localhost:30027`.
- PostgreSQL 17 runs only through `apps/backend/compose.yaml` (`npm run db:up`), with `.env.docker` holding its user and password.
  `npm run db:reset` drops the volume.

## Database

- One schema, `public`, created by the versioned migrations of `src/common/database/migrations` (listed in `index.ts`). A fresh
  installation applies the baseline; changes are new migrations appended to the list, never edits of an applied one.
- `start:prod` (and the Docker image) applies pending migrations under an advisory lock before the API listens.
- Services use `DataSource.query`/`transaction` with parameters only; there are no TypeORM entities. `UPDATE`/`DELETE` answer
  `[rows, affectedCount]`; destructure them as `Updated<Row>` (`common/database/sql.ts`).
- Invariants are also database checks: bilingual JSON shapes (`{ pt?, en? }`), slug grammar (`pmn_valid_slugs`), unique
  slug per language, immutable audit log, protected system roles and system themes, single settings row.

## Demo data and test accounts

- `npm run db:seed:demo` (needs `.env.demo-seed`, from `.env.demo-seed.example`, Git-ignored): the newsroom of a technology
  portal: an administrator, an editor, a reporter and a reviewer, eight technology sections, sixteen fictitious bilingual
  news items (one in Portuguese only, one in review, one scheduled), two weeks of reads and the front page. Refuses production.
- The content lives in `seed-demo-content.ts`. Covers are real, openly licensed photographs (public domain, CC0, CC BY,
  CC BY-SA) named there by their Wikimedia Commons file, author and licence; `seed-photos.ts` fetches each at seed time
  (fixed host, bounded size, 16:9 crop), stores it like any upload in the configured store and writes the author and
  licence as the media credit. No photo is kept in the repository; offline, the local provider's placeholder stands in.
- `SEED_RESET_CONTENT=1` first removes news, sections, tags and media (accounts and settings stay).
- Use the seed accounts to verify changes in the running application; never copy their values into tracked files.

## File storage

- Every file the portal stores (media renditions, brand images, profile photos) goes through `StorageService`
  (`common/storage`), never the filesystem directly: `STORAGE_DRIVER=s3` writes to a private S3-compatible bucket (R2 in
  development and production, under `S3_KEY_PREFIX`: `dev`, `prd`), `local` to `STORAGE_LOCAL_DIR`. What belongs to the
  code stays in the repository: the default brand images in `apps/frontend/public/brand` and the documentation.
- `npm run storage:check` proves the bucket answers; `npm run storage:copy-local` copies the local store's files to the
  bucket under the same keys, to switch an installation that started on disk. The local files stay until removed by hand.

## Tests

- Backend: `npm test` (unit, vitest), `npm run test:database` (integration on a throwaway database of the Docker PostgreSQL:
  `createNewsroom()` in `test/support/newsroom.ts` boots the whole API with storage in memory, the local AI provider and one
  account per system role). The application module is imported only after the environment points at the throwaway database.
- Frontend: `npm test` (vitest; `renderMarkup` in `src/test-support/render.tsx`), `npx tsc --noEmit -p tsconfig.json`, `npm run lint`.
- Contract tests keep both projects identical where they mirror each other: hosts, locales, permissions, theme tokens, article grammar.
- Root: `node --test scripts/*.test.mjs`, `node scripts/sync-docs.mjs --check`, `node scripts/api-routes.mjs --check`.
- A build check must not disturb `npm run dev`: `PMN_PREVIEW=1 npx next build` writes to `.next-preview`.

## Production

- Each project ships its own image (`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`): Node from `.nvmrc`, settings and
  secrets only at runtime, `tini` as PID 1, non-root user. Health: API `/health` (liveness) and `/health/ready` (database);
  frontend `/api/health`.
- `SCHEDULER=true` on exactly the instances that should publish scheduled news (the update is idempotent anyway).
