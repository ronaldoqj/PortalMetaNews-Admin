# Rotas da API

Gerado por `node scripts/api-routes.mjs` a partir dos controladores da API; não edite à mão.
Cada linha traz o método, o caminho (relativo ao host da API, sem prefixo), quem pode chamar e o arquivo que a define.
A permissão indicada é a que o controlador exige; os serviços conferem de novo e aplicam o escopo de cada registro.

## Público (site, temas, mídia e saúde)

| Método | Caminho | Quem pode chamar | Arquivo |
| --- | --- | --- | --- |
| GET | `/health` | público | `common/health/health.controller.ts` |
| GET | `/health/ready` | público | `common/health/health.controller.ts` |
| GET | `/public/authors/:id` | público | `modules/public/public.controller.ts` |
| GET | `/public/authors/:id/avatar` | público | `modules/public/public.controller.ts` |
| GET | `/public/branding/assets/:file` | público | `modules/public/public.controller.ts` |
| GET | `/public/categories/:slug` | público | `modules/public/public.controller.ts` |
| POST | `/public/contact` | público | `modules/public/public.controller.ts` |
| GET | `/public/feed` | público | `modules/public/public.controller.ts` |
| GET | `/public/home` | público | `modules/public/public.controller.ts` |
| GET | `/public/legal/:kind` | público | `modules/public/public.controller.ts` |
| GET | `/public/media/:id/:variant` | público | `modules/public/public.controller.ts` |
| GET | `/public/news` | público | `modules/public/public.controller.ts` |
| POST | `/public/news/:id/view` | público | `modules/public/public.controller.ts` |
| GET | `/public/news/by-slug/:slug` | público | `modules/public/public.controller.ts` |
| GET | `/public/news/most-read` | público | `modules/public/public.controller.ts` |
| GET | `/public/site` | público | `modules/public/public.controller.ts` |
| GET | `/public/sitemap` | público | `modules/public/public.controller.ts` |
| GET | `/public/tags/:slug` | público | `modules/public/public.controller.ts` |
| GET | `/robots.txt` | público | `common/robots/robots.controller.ts` |

## Sessão do painel

| Método | Caminho | Quem pode chamar | Arquivo |
| --- | --- | --- | --- |
| POST | `/auth/force-password-change` | público | `common/access/access.controller.ts` |
| POST | `/auth/initial-setup` | público | `common/access/access.controller.ts` |
| POST | `/auth/login` | público | `common/access/access.controller.ts` |
| DELETE | `/auth/session` | sessão do painel | `common/access/access.controller.ts` |
| GET | `/auth/session` | sessão do painel | `common/access/access.controller.ts` |
| GET | `/auth/setup-status` | público | `common/access/access.controller.ts` |

## Painel administrativo

| Método | Caminho | Quem pode chamar | Arquivo |
| --- | --- | --- | --- |
| GET | `/panel/ai-writer/conversations` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| POST | `/panel/ai-writer/conversations` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| DELETE | `/panel/ai-writer/conversations/:id` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| GET | `/panel/ai-writer/conversations/:id` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| PATCH | `/panel/ai-writer/conversations/:id` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| POST | `/panel/ai-writer/conversations/:id/messages` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| POST | `/panel/ai-writer/messages/:id/apply` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| POST | `/panel/ai-writer/messages/:id/illustrate` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| GET | `/panel/ai-writer/status` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| GET | `/panel/ai-writer/styles` | ai:use | `modules/ai-writer/ai-writer.controller.ts` |
| GET | `/panel/audit` | audit:read | `modules/team/team.controller.ts` |
| GET | `/panel/badges` | conta do painel | `modules/dashboard/dashboard.controller.ts` |
| GET | `/panel/categories` | conta do painel | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/categories` | taxonomy:manage | `modules/newsroom/newsroom.controller.ts` |
| DELETE | `/panel/categories/:id` | taxonomy:manage | `modules/newsroom/newsroom.controller.ts` |
| PATCH | `/panel/categories/:id` | taxonomy:manage | `modules/newsroom/newsroom.controller.ts` |
| PUT | `/panel/categories/order` | taxonomy:manage | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/contacts` | contacts:read | `modules/site/site.controller.ts` |
| GET | `/panel/contacts/:id` | contacts:read | `modules/site/site.controller.ts` |
| PUT | `/panel/contacts/:id/status` | contacts:read | `modules/site/site.controller.ts` |
| GET | `/panel/dashboard` | news:read | `modules/dashboard/dashboard.controller.ts` |
| GET | `/panel/front-page` | news:read | `modules/newsroom/newsroom.controller.ts` |
| PUT | `/panel/front-page` | front_page:manage | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/legal` | site:manage | `modules/site/site.controller.ts` |
| DELETE | `/panel/legal/:kind/:edition` | site:manage | `modules/site/site.controller.ts` |
| GET | `/panel/legal/:kind/:edition` | site:manage | `modules/site/site.controller.ts` |
| PUT | `/panel/legal/:kind/:edition` | site:manage | `modules/site/site.controller.ts` |
| GET | `/panel/media` | news:read ou media:manage | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/media` | media:manage | `modules/newsroom/newsroom.controller.ts` |
| DELETE | `/panel/media/:id` | media:manage | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/media/:id` | news:read ou media:manage | `modules/newsroom/newsroom.controller.ts` |
| PATCH | `/panel/media/:id` | media:manage | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/media/generate` | media:manage | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/news` | news:read | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/news` | news:write | `modules/newsroom/newsroom.controller.ts` |
| DELETE | `/panel/news/:id` | news:delete | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/news/:id` | news:read | `modules/newsroom/newsroom.controller.ts` |
| PATCH | `/panel/news/:id` | news:write ou news:edit_all | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/news/:id/revisions` | news:read | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/news/:id/revisions/:revisionId` | news:read | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/news/:id/revisions/:revisionId/restore` | news:write ou news:edit_all | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/news/:id/status` | news:read | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/profile` | conta do painel | `modules/team/team.controller.ts` |
| PATCH | `/panel/profile` | conta do painel | `modules/team/team.controller.ts` |
| DELETE | `/panel/profile/avatar` | conta do painel | `modules/team/team.controller.ts` |
| PUT | `/panel/profile/avatar` | conta do painel | `modules/team/team.controller.ts` |
| GET | `/panel/settings/ai` | settings:manage | `modules/settings/settings.controller.ts` |
| PUT | `/panel/settings/ai` | settings:manage | `modules/settings/settings.controller.ts` |
| GET | `/panel/settings/ai/status` | conta do painel | `modules/settings/settings.controller.ts` |
| GET | `/panel/settings/ai/styles` | settings:manage | `modules/settings/settings.controller.ts` |
| POST | `/panel/settings/ai/styles` | settings:manage | `modules/settings/settings.controller.ts` |
| DELETE | `/panel/settings/ai/styles/:id` | settings:manage | `modules/settings/settings.controller.ts` |
| PATCH | `/panel/settings/ai/styles/:id` | settings:manage | `modules/settings/settings.controller.ts` |
| POST | `/panel/settings/ai/test` | settings:manage | `modules/settings/settings.controller.ts` |
| GET | `/panel/settings/email` | settings:manage | `modules/settings/settings.controller.ts` |
| PUT | `/panel/settings/email` | settings:manage | `modules/settings/settings.controller.ts` |
| POST | `/panel/settings/email/test` | settings:manage | `modules/settings/settings.controller.ts` |
| GET | `/panel/settings/storage` | settings:manage | `modules/settings/settings.controller.ts` |
| GET | `/panel/site` | site:manage ou themes:manage | `modules/site/site.controller.ts` |
| PUT | `/panel/site` | site:manage | `modules/site/site.controller.ts` |
| DELETE | `/panel/site/assets/:slot` | themes:manage | `modules/site/site.controller.ts` |
| POST | `/panel/site/assets/:slot` | themes:manage | `modules/site/site.controller.ts` |
| GET | `/panel/tags` | conta do painel | `modules/newsroom/newsroom.controller.ts` |
| POST | `/panel/tags` | taxonomy:manage ou news:write | `modules/newsroom/newsroom.controller.ts` |
| DELETE | `/panel/tags/:id` | taxonomy:manage | `modules/newsroom/newsroom.controller.ts` |
| PATCH | `/panel/tags/:id` | taxonomy:manage | `modules/newsroom/newsroom.controller.ts` |
| GET | `/panel/team/authors` | news:read | `modules/team/team.controller.ts` |
| GET | `/panel/team/roles` | users:manage | `modules/team/team.controller.ts` |
| POST | `/panel/team/roles` | users:manage | `modules/team/team.controller.ts` |
| DELETE | `/panel/team/roles/:id` | users:manage | `modules/team/team.controller.ts` |
| PUT | `/panel/team/roles/:id` | users:manage | `modules/team/team.controller.ts` |
| GET | `/panel/team/users` | users:manage | `modules/team/team.controller.ts` |
| POST | `/panel/team/users` | users:manage | `modules/team/team.controller.ts` |
| PATCH | `/panel/team/users/:id` | users:manage | `modules/team/team.controller.ts` |
| DELETE | `/panel/team/users/:id/avatar` | users:manage | `modules/team/team.controller.ts` |
| GET | `/panel/team/users/:id/avatar` | conta do painel | `modules/team/team.controller.ts` |
| PUT | `/panel/team/users/:id/avatar` | users:manage | `modules/team/team.controller.ts` |
| POST | `/panel/team/users/:id/temporary-password` | users:manage | `modules/team/team.controller.ts` |
| GET | `/panel/themes` | themes:manage | `modules/site/site.controller.ts` |
| POST | `/panel/themes` | themes:manage | `modules/site/site.controller.ts` |
| DELETE | `/panel/themes/:id` | themes:manage | `modules/site/site.controller.ts` |
| GET | `/panel/themes/:id` | themes:manage | `modules/site/site.controller.ts` |
| PATCH | `/panel/themes/:id` | themes:manage | `modules/site/site.controller.ts` |
| POST | `/panel/themes/:id/activate` | themes:manage | `modules/site/site.controller.ts` |
| POST | `/panel/translate` | ai:use | `modules/newsroom/newsroom.controller.ts` |

Total: 110 rotas.
