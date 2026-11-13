# Portas de desenvolvimento

As portas locais terminam em `27` e são definidas uma única vez, no `.env` da raiz. Nenhum outro arquivo as repete.

| Serviço | Variável | Porta | Endereço |
| --- | --- | --- | --- |
| Site e painel (Next.js) | `FRONTEND_PORT` | `3027` | `http://localhost:3027` e `http://painel.localhost:3027` |
| API (NestJS) | `BACKEND_PORT` | `30027` | `http://localhost:30027` |
| PostgreSQL (Docker) | `POSTGRES_PORT` | `5427` | `localhost:5427` |

- `npm run dev` (em `apps/frontend` e em `apps/backend`) lê o `.env` da raiz pelo lançador `scripts/dev.mjs`, exige
  `NODE_ENV=development` e deriva a porta de cada processo, a `BACKEND_INTERNAL_URL` do frontend e a `CORS_ORIGINS` do backend.
- O banco: o Docker Compose do backend lê `POSTGRES_PORT` do `apps/backend/.env.docker`, e a `DATABASE_URL` do
  `apps/backend/.env` aponta para a mesma porta (`postgresql://pmn:<senha>@localhost:5427/portalmetanews`). A porta interna
  do contêiner continua `5432`.
- Para mudar uma porta, edite só o `.env` da raiz (e, para o banco, os dois arquivos acima) e reinicie; frontend e API
  precisam de portas diferentes. Os testes do lançador ficam em `scripts/dev.test.mjs` (`node --test scripts/dev.test.mjs`).
- Assim o Portal Meta News roda ao lado do AR Ética (portas terminadas em 31) e da Lora (terminadas em 13) sem conflito.
- Em produção as portas vêm do ambiente da implantação ([docs/implantacao.md](docs/implantacao.md)).
