# Portal Meta News

Portal de notícias bilíngue (português e inglês) com painel administrativo completo. A redação escreve, traduz, revisa e
publica notícias — à mão ou com o **redator com IA**, que entrega texto e imagens prontos para virar rascunho —, monta a
capa, cuida da mídia, das editorias, das tags, dos **temas** (tokens de design totalmente personalizáveis) e da equipe.

A estrutura segue a do projeto AR Ética (Next.js + NestJS + PostgreSQL, biblioteca de componentes, temas por tokens,
documentação viva publicada no painel), sem a criptografia de dados, que era exigência apenas do canal de denúncias.

## Pré-requisitos

- Node.js `24.20.0` (`.nvmrc`; use `nvm use`) e npm `11.19.0` ou mais novo.
- Docker com Compose, só para o PostgreSQL 17.

## Rodando localmente

Dois projetos independentes, sem `package.json` na raiz: `apps/backend` (API NestJS) e `apps/frontend` (Next.js).

1. Portas: copie `.env.example` para `.env` na raiz — site e painel em `3027`, API em `30027`, PostgreSQL em `5427`
   ([README-DEV-PORTS.md](README-DEV-PORTS.md)).
2. Backend, em `apps/backend`:
   ```bash
   cp .env.example .env && cp .env.docker.example .env.docker   # preencha APP_SECRET_KEY: openssl rand -hex 32
   npm ci
   npm run db:up          # PostgreSQL 17 (apps/backend/compose.yaml)
   npm run db:migrate     # aplica as migrações
   npm run dev            # API em http://localhost:30027
   ```
3. Dados de demonstração (opcional): `cp .env.demo-seed.example .env.demo-seed`, escolha senhas só de teste e rode
   `npm run db:seed:demo` (equipe, editorias, notícias ilustradas, leituras e capa).
4. Frontend, em `apps/frontend`: `cp .env.example .env.local && npm ci && npm run dev`.
5. Primeiro acesso: abra `http://painel.localhost:3027`; sem nenhuma conta, o painel oferece a instalação (ou use
   `ADMIN_BOOTSTRAP_*` no `.env` do backend).

Endereços locais: `http://localhost:3027` (site) e `http://painel.localhost:3027` (painel). As contas de teste ficam em
`apps/backend/.env.demo-seed`, ignorado pelo Git.

**IA:** sem chave, em desenvolvimento, o provedor local simula tudo (traduções marcadas com `[EN]`/`[PT]`, rascunhos
montados a partir da pauta e capas ilustrativas). Para IA real, informe uma chave do Gemini em Configurações →
Inteligência artificial (ou `GEMINI_API_KEY`).

## Verificações

| Onde | Comando |
| --- | --- |
| Backend | `npm run lint`, `npx tsc --noEmit -p tsconfig.build.json`, `npm test`, `npm run test:database` |
| Frontend | `npm run lint`, `npx tsc --noEmit -p tsconfig.json`, `npm test`; build sem atrapalhar o `dev`: `PMN_PREVIEW=1 npx next build` |
| Raiz | `node --test scripts/*.test.mjs`, `node scripts/sync-docs.mjs --check`, `node scripts/api-routes.mjs --check` |

## Estrutura

```
apps/backend    API NestJS 12, PostgreSQL 17 (common: acesso, IA, auditoria, banco, e-mail, armazenamento; modules: redação, redator IA, site, equipe, configurações)
apps/frontend   Next.js 16, Mantine 7, next-intl (site público e painel)
docs            guias em português e regras de arquitetura em inglês (docs/architecture)
scripts         lançador de desenvolvimento, documentação viva, rotas da API e geração da identidade visual
```

## Documentação

O índice está em [DOCUMENTATION.md](DOCUMENTATION.md) e é publicado no painel, em "Documentação". Regras do projeto para
pessoas e assistentes de IA: [CLAUDE.md](CLAUDE.md).
