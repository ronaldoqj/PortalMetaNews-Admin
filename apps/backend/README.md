# API do Portal Meta News

API NestJS 12 em TypeScript estrito (ESM) sobre PostgreSQL 17. Só o servidor do frontend a chama; ela responde na raiz do
próprio host (`api.<domínio>`), sem prefixo. Rotas: [docs/architecture/api-routes.md](../../docs/architecture/api-routes.md).

## Módulos

| Pasta | O que faz |
| --- | --- |
| `src/common/access` | Contas, sessões (token opaco com hash SHA-256), Argon2id, bloqueio após 5 erros, primeiro acesso, instalação, permissões e guardas (`@RequirePermissions`, negar por padrão) |
| `src/common/ai` | Provedores de IA (Gemini e local determinístico), configuração com chave cifrada, prompts editoriais (`prompts.ts`) |
| `src/common/rich-text` | Gramática estrita do corpo das notícias (`article-html.ts`) e do texto rico simples (`rich-text.ts`) |
| `src/common/storage` | Armazenamento local ou S3, variantes das imagens da mídia (`media-images.ts`), imagens de marca e fotos |
| `src/common/{audit,database,health,i18n,mail,protection,robots,secrets}` | Trilha de auditoria imutável, migrações e seed, saúde, textos bilíngues, e-mail SMTP, proteção de formulários, `robots.txt`, `SecretCipher` |
| `src/modules/newsroom` | Notícias (fluxo editorial, revisões, slugs, concorrência otimista), editorias, tags, mídia, tradução, capa, agendador e consultas públicas |
| `src/modules/ai-writer` | Redator com IA: conversas, streaming (SSE), proposta bilíngue estruturada, capa gerada e criação do rascunho |
| `src/modules/site` | Identidade do site, gerenciador de temas, textos legais e mensagens de contato |
| `src/modules/{team,settings,dashboard,public}` | Equipe, perfis e auditoria; IA, e-mail e armazenamento; visão geral; endpoints do site |

## Comandos

| Comando | Para quê |
| --- | --- |
| `npm run dev` | API em modo observação, na porta do `.env` da raiz (30027) |
| `npm run db:up` / `db:down` / `db:reset` / `db:logs` | PostgreSQL do Docker Compose (porta 5427) |
| `npm run db:migrate` | Aplica as migrações |
| `npm run db:seed:demo` | Dados de demonstração (precisa de `.env.demo-seed`) |
| `npm run admin:bootstrap` | Cria o primeiro administrador a partir de `ADMIN_BOOTSTRAP_*` |
| `npm run storage:check` | Confere o armazenamento configurado |
| `npm test` / `npm run test:database` | Testes unitários / de integração com banco descartável |
| `npm run lint` | oxlint |

Configuração: [.env.example](.env.example) (cada variável comentada). Regras: [docs/architecture/backend-conventions.md](../../docs/architecture/backend-conventions.md).
