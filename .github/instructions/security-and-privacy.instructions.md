---
name: "Portal Meta News Security and Privacy"
description: "Use when implementing or reviewing authentication, authorization, the editorial workflow, the public site, uploads, object storage, AI prompts and answers, secrets, logging, auditing or LGPD/GDPR-sensitive data flows."
applyTo: "apps/**/*.ts, apps/**/*.tsx"
---

# Portal Meta News Security and Privacy

## Synchronization Rule

Regra de Sincronização: sempre que uma diretriz de segurança, arquitetura, estilo ou contexto for adicionada, modificada ou removida nas instruções do Copilot (`.github/`), atualize imediatamente o `CLAUDE.md` na raiz (e vice-versa), garantindo total consistência entre os assistentes.

## Accounts and permissions

- Derive the actor from the session (`SessionGuard` → `Actor`); never trust an id, an owner, a role or a status sent by the browser.
- Every controller of the panel uses `@PanelController()` and every handler declares `@RequirePermissions(...)`; a handler without it is refused (`PermissionGuard`, deny by default). Services check again with `requirePermission`, and apply the item-level rules (a reporter edits only its own draft or item in review; a published item needs `news:edit_all`).
- The role is read on every request; disabling an account or changing its role revokes its sessions or takes effect on the next call. At least one enabled account keeps `users:manage` (`TeamService.write`).
- Passwords: Argon2id, 12-128 characters with three classes; five wrong answers lock the account for 15 minutes; temporary passwords only yield a password-change token. Sessions: random 256-bit tokens stored as SHA-256, 12 hours, HttpOnly host-only cookie `pmn-panel` on the panel's host alone.
- The first account is created only while none exists (`/auth/initial-setup`, needs `PANEL_SETUP_TOKEN` in production) or from `ADMIN_BOOTSTRAP_*`.

## Public site and readers

- The site reads only published content, in the language of the page (`n.locales @> ARRAY[locale]`), and only through the public endpoints, which never personalize answers.
- No IP address, User-Agent, fingerprint or identifying cookie of a reader is read or stored; reads are counted per item and per day (`news_views`). No third-party script, font or image on any page: media and brand images come through the frontend's relays.
- The contact form has a honeypot and a shared budget per minute (`FormProtectionService`, `rate_limits`); the message is stored as canonical rich text; the notice e-mail carries no content.

## Content and uploads

- Article bodies are parsed strictly (`article-html.ts`): closed list of tags and attributes, links only `http(s)`/`mailto`, images only `/media/<uuid>/<size>`. Never render stored HTML with `dangerouslySetInnerHTML`; use `ArticleBody`.
- Images: type detected from the leading bytes (PNG, JPEG, WebP), size-limited, decoded with a pixel limit and re-encoded into renditions (no EXIF/GPS/XMP), stored under `media/<random id>/`. The original upload is never kept. Brand images and photos follow the same rule.
- Files are served with `nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`; uploads from the browser are same-origin only (`sameOrigin`) and streamed through the relays without buffering.

## AI

- Prompts are defined only in `common/ai/prompts.ts`; content sent to the model is the editor's brief, the conversation, the section names and the style guide — never account data or other news.
- Model output is data: bodies pass `lenientArticleHtml`, proposals `normalizeProposal`, translations are trimmed; nothing the model returns becomes markup, a URL outside the grammar or an instruction to the system.
- The provider key is stored encrypted (`SecretCipher`, purpose-bound AAD), write-only, never logged; a key that no longer decrypts counts as none.

## Secrets, logs and audit

- Never hardcode secrets or fallback credentials; settings are validated at start (`environment.validation.ts`) and errors name keys, never values.
- Never log article text, prompts, AI answers, messages, file contents, tokens or passwords. `audit_logs` is append-only (database trigger) and records actor, action, resource, outcome and identifiers only.
- Outbound SMTP destinations of the panel are validated against private and metadata ranges in production (`smtp-transport.ts`).

## Review checklist

1. Each new endpoint declares its permission, and the service repeats the check and the item-level rule.
2. Public endpoints return published content only and read nothing about the reader.
3. New stored HTML passes the strict grammar; new images are re-encoded.
4. No secret, prompt, AI answer or message body reaches a log, an audit record or an error.
5. Both languages have the new messages; documentation reflects the change.
