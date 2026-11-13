# Implantação em produção

Cada projeto vira uma imagem própria (`apps/backend/Dockerfile` e `apps/frontend/Dockerfile`). Configurações e segredos
chegam só pelo ambiente, na execução; nada vai para a imagem.

## Domínios

- `SITE_DOMAIN` (igual nos dois projetos), por exemplo `metanews.com.br`: o site em `metanews.com.br`, o painel em
  `painel.metanews.com.br` e a API em `api.metanews.com.br` (ou só na rede interna).
- Aponte o DNS dos três nomes (e de `www.`, que redireciona para o site) para o proxy reverso com HTTPS.

## API (`apps/backend`)

| Variável | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | a porta do contêiner |
| `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_POOL_MAX` | PostgreSQL 17 gerenciado ou próprio |
| `APP_SECRET_KEY` | `openssl rand -hex 32` — protege só a senha SMTP e a chave da IA; trocá-la obriga a informá-las de novo |
| `CORS_ORIGINS` | `https://metanews.com.br,https://painel.metanews.com.br` |
| `SITE_DOMAIN`, `SITE_PUBLIC_URL` | o domínio e, opcionalmente, a origem pública do site |
| `PANEL_SETUP_TOKEN` | segredo de 24+ caracteres para instalar o painel pelo navegador (remova depois) |
| `STORAGE_DRIVER` + `S3_*` | `s3` com um bucket privado (R2, S3, MinIO) ou `local` com volume persistente em `/app/storage` |
| `GEMINI_API_KEY` (opcional) | chave do servidor; a salva no painel tem prioridade |
| `SCHEDULER` | `true` em uma instância (publica as notícias agendadas) |
| `SMTP_*` (opcional) | relay de e-mail; o painel também pode guardar o seu |

O contêiner aplica as migrações pendentes antes de escutar (`start:prod`) e responde a `/health` e `/health/ready`.

**Arquivos no bucket.** Todas as imagens enviadas ou geradas (mídia, logotipos e favicons trocados no painel, fotos de
perfil) ficam no bucket; cada ambiente usa o seu prefixo (`S3_KEY_PREFIX`: `dev`, `prd`). `npm run storage:check` confirma
que o bucket responde. Uma instalação que começou no disco passa para o bucket assim: preencha os `S3_*`, troque
`STORAGE_DRIVER` para `s3`, rode `npm run storage:copy-local` (copia os arquivos com as mesmas chaves) e reinicie a API.
Os arquivos locais continuam no disco até você apagá-los. Ficam no próprio projeto apenas a identidade visual padrão
(`apps/frontend/public/brand`) e a documentação.

## Frontend (`apps/frontend`)

| Variável | Valor |
| --- | --- |
| `SITE_DOMAIN` | o mesmo da API |
| `BACKEND_INTERNAL_URL` | `https://api.metanews.com.br` ou o endereço interno da API, sem caminho |

Responde a `/api/health`. O navegador nunca chama a API: só o servidor do frontend.

## Primeiro acesso

1. Abra `https://painel.<domínio>`: sem nenhuma conta, a página de entrada pede o token de instalação (`PANEL_SETUP_TOKEN`)
   e cria o primeiro administrador. Alternativa sem navegador: `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` na API.
2. Remova o token e as variáveis de bootstrap do ambiente.
3. No painel: Dados do site, Identidade visual (logos e favicons), Temas, Configurações → IA (chave do Gemini) e E-mail,
   Equipe e perfis, Textos legais (revisados pelo jurídico).
