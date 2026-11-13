# Frontend do Portal Meta News

Next.js 16 (App Router), Mantine 7, next-intl e TypeScript estrito. Serve duas áreas, cada uma em seu host: o **site**
de notícias (`localhost:3027`, grupo de rotas `(site)`) e o **painel** (`painel.localhost:3027`, grupo `(panel)`).

## Onde fica cada coisa

| Pasta | O que tem |
| --- | --- |
| `src/proxy.ts`, `src/theme/host-context.ts` | Host → área, idioma, endereços localizados, cabeçalhos confiáveis |
| `src/i18n` | Idiomas (`pt`, `en`), rotas localizadas (`routing.ts`), catálogos em partes (`messages/<idioma>/*.json`) |
| `src/theme`, `src/tokens` | Tokens do tema (paletas, campos, tipografia, raio, layout do site) renderizados como variáveis CSS no SSR |
| `src/components/ui` | Biblioteca central de componentes (página, seção, listas, formulários automáticos, diálogos, formatação) |
| `src/components/admin` | Sessão do painel, `panelApi`, contratos, permissões, ações genéricas de recurso |
| `src/components/layout` | Moldura do painel (menu como dado, migalhas, menus de conta e idioma) e das páginas de entrada |
| `src/components/forms` | Gramática do corpo das notícias e `ArticleBody` |
| `src/components/{newsroom,writer,themes,settings,site,seo,documentation}` | As telas de cada área |
| `src/app` | Rotas: `[locale]/(site)`, `[locale]/(panel)`, relays de mídia, marca, feed, sitemap e saúde |

## Comandos

| Comando | Para quê |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento na porta do `.env` da raiz (3027); mantém a cópia da documentação |
| `npm test` | Testes (vitest) |
| `npm run lint` / `npx tsc --noEmit -p tsconfig.json` | ESLint / tipos |
| `PMN_PREVIEW=1 npx next build` | Build de verificação sem atrapalhar o `dev` |

Configuração: [.env.example](.env.example). Regras: [docs/architecture/frontend-conventions.md](../../docs/architecture/frontend-conventions.md).
