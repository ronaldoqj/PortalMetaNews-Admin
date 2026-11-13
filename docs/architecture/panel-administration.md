# Panel administration

Rules of the panel's administration screens: team and roles, own profile, integrations (AI, e-mail, storage),
readers' messages, audit trail, legal texts and documentation. Guide: [Administração do painel](../painel-administracao.md).

## Access and roles

- Permissions are the closed list of `common/access/permissions.ts`, mirrored by the frontend's
  `components/admin/permissions.ts` and copied literally by the baseline migration (contract-tested). Every panel
  endpoint declares `@RequirePermissions` (deny by default) and every service calls `requirePermission` again.
- System roles (`admin`, `editor`, `reporter`, `reviewer`) are seeded by the baseline: the database trigger
  `protect_role` keeps their slug and baseline permissions and refuses their deletion; the API also keeps their name and
  description (`role_system`, `role_baseline`). The interface names them from `Roles.system.<slug>`, never from the
  stored name.
- Any write permission on news implies `news:read` (`normalizePermissions`).
- Access writes (`TeamService.write`) take the advisory lock `panel-access`, re-read the actor's permissions inside the
  transaction and, before committing, require at least one enabled account holding `users:manage` (`access_lockout`).
  An account never changes its own role or enabled flag.
- New accounts and password resets get a 16-character temporary password from the CSPRNG
  (`generateTemporaryPassword`), shown once (`TemporaryCredentialsDialog`, delivery `manual`), stored only as Argon2id.
  A temporary password yields only a 15-minute single-use token for the first-access page; the session exists only after
  a definitive password. Disabling an account or issuing a temporary password deletes its sessions and pending tokens.
- The screens group permissions by `PERMISSION_GROUPS` (`team-contracts.ts`); every permission belongs to exactly one
  group and has a label and description in both catalogs (`team-contracts.test.ts`).

## Profile and photos

- `panel/profile` lets any account edit its own name and author profile (`jobTitle`, `bio`: `I18nString`, 120 and
  1,000 characters), shown by the site beside bylines and on the author page. E-mail and role are read-only there.
- Photos are uploaded through the frontend relays (`/[locale]/api/panel/profile/avatar`,
  `/[locale]/api/panel/users/[id]/avatar`, multipart, forwarded as `PUT`) and rebuilt by the API (256x256 WebP, no
  metadata) under a new random key; the previous object is deleted after the new reference is committed.

## Integrations

- AI (`panel/settings/ai`, `settings:manage`): provider `auto | gemini | local | disabled`; the key is write-only
  (omitted keeps it, `""` removes it), encrypted by `SecretCipher` (`ai-api-key`, owner `site`); text and image model
  names are validated against `MODEL`; `guidelines` (≤ 4,000) are appended to every prompt (`common/ai/prompts.ts`).
  `POST panel/settings/ai/test` translates one word through the saved configuration. `GET panel/settings/ai/status`
  (any account) tells the builder whether translation is available. In production `auto` without a key is unavailable.
- E-mail (`panel/settings/email`): off by default; the panel relay (password write-only, `smtp-password`) wins over the
  environment's (`SMTP_*`). Relay validation (`validatePanelSmtp`) refuses internal hosts in production and mismatched
  port/TLS pairs. `POST panel/settings/email/test` verifies the connection and sends a test to the actor's own e-mail.
- Storage (`panel/settings/storage`) is read-only: driver, reachability, bucket, upload limit and media totals. The
  driver and its credentials come from the environment only.

## Readers' messages

- The site's contact form (`POST public/contact`) passes the honeypot and the shared rate budget
  (`FormProtectionService`, never keyed by IP), stores only what the reader typed (canonical rich text) and announces a
  new message by e-mail to `settings.contact_email` without its content.
- `contacts:read` lists (filters `status`, `topic`, `search`; archived only when asked), opens and moves messages
  between `new`, `read` and `archived`; the first reader and time are kept, and every move is audited.
- Opening a `new` message marks it `read` once (client effect); the menu badge counts `new` messages
  (`GET panel/badges`).

## Audit trail

- `audit_logs` is append-only (a statement trigger rejects `UPDATE`, `DELETE` and `TRUNCATE`). Records hold actor,
  action (`<area>.<event>`), resource type and id, outcome and identifier-only metadata — never article text,
  credentials or message bodies. System actions (the scheduler) have no actor.
- `GET panel/audit` (`audit:read`) filters by action substring, outcome, inclusive date range and resource id, 50 per
  page. The interface names known actions from `Audit.actions.<area_event>` and unknown ones by their area
  (`audit-contracts.ts`), always showing the raw action too. A new audited action needs its label in both catalogs.

## Legal texts

- Editions are `pt` and `en` (`modules/site/site-legal.ts`, mirrored by `components/site-legal/contracts.ts`). An
  edition is the panel's stored text or, without one, the default shipped in `legal-defaults/`; `DELETE` restores the
  default. Only `site:manage` edits; changes are audited with the stable document id, never the text.
- Content is Markdown rendered as React elements with raw HTML dropped (`components/documentation/markdown.ts`), the
  same renderer as the documentation; the editor's preview is the site's rendering.

## Documentation

- Published as described in [A documentação no painel](../documentacao-no-painel.md): `DOCUMENTATION.md` →
  `scripts/sync-docs.mjs` → `apps/frontend/content/docs` (committed, never in `public/`).
- The pages check `documentation:read` before reading any file, open only slugs present in `catalog.json`, and show an
  empty state (not an error) while nothing is published (`documentation-access.test.ts`).

## Frontend conventions of the area

- Server pages read the actor with `currentActor()` and render `ForbiddenNotice` when the permission is missing; data
  comes from `panelApi(path, { permission, schema })`, whose contracts mirror the API's views exactly
  (`team-contracts.ts`, `contacts-contracts.ts`, `audit-contracts.ts`, `settings/contracts.ts`, `site-legal/contracts.ts`).
- Mutations are `"use server"` actions with fixed paths returning `ApiResult`; refusals carry the API's `code`
  (`email_taken`, `role_in_use`, `access_lockout`, `ai_key_required`, `smtp_invalid`...) worded by the screen's namespace.
- All copy lives in `messages/{pt,en}/admin.json` (namespaces `Access`, `Profile`, `Credentials`, `Contacts`, `Audit`,
  `Settings`, `AiSettings`, `EmailSettings`, `Storage`, `SiteLegal`, `Documentation`), kept in parity by `messages.test.ts`.
  `SiteLegal.updatedOn`, `SiteLegal.onThisPage`, `SiteLegal.unavailable` and `Documentation.*` labels are also read by
  the site's legal pages.
