# A documentação no painel

A documentação do Portal Meta News é **viva**: os mesmos arquivos Markdown que orientam o desenvolvimento (e os
assistentes de código) são publicados automaticamente no painel, em **Administração → Documentação**, onde podem ser
lidos e revisados por quem administra o portal. Não existe uma segunda cópia para manter: quem altera uma regra altera
o documento, e o painel passa a mostrar a nova versão.

## Como a documentação é organizada

| Camada | Onde fica | Idioma | Para que serve |
| --- | --- | --- | --- |
| Contexto enxuto | `CLAUDE.md` (raiz) | Inglês | Lido em todo prompt: invariantes do produto, regras gerais e **uma linha por área**, apontando para o documento completo. |
| Espelho do Copilot | `.github/copilot-instructions.md` | Inglês | O mesmo conteúdo do `CLAUDE.md` para o GitHub Copilot (regra de sincronização). Não é publicado. |
| Regras por área | `docs/architecture/*.md` | Inglês | As regras completas de cada área (redação, redator com IA, temas, site, administração do painel...). Lidas antes de mexer na área. |
| Guias | `docs/*.md` | Português | Como cada funcionalidade se comporta, para quem usa, opera e decide. |
| Referência gerada | `docs/architecture/api-routes.md` | Português | Todas as rotas da API e quem pode chamá-las, gerada a partir do código. |
| Histórico | `DEVELOPMENT-HISTORY.md` (apelido: `LOG.md`) | Português | O que foi construído, em ordem, e por quê. |
| Pendências | `PENDENCIAS.md` | Português | O que ficou para depois e as decisões ainda em aberto. |
| Índice | `DOCUMENTATION.md` | Português | A lista do que é publicado no painel, em grupos e na ordem em que aparece. |

A regra que mantém o contexto enxuto: **o que precisa de mais de duas linhas para ser explicado vai para o documento
da área**, e o `CLAUDE.md` fica só com o resumo e o caminho. Assim o arquivo lido em todo prompt continua pequeno, e o
detalhe só é carregado quando o trabalho é naquela área.

## Como um documento chega ao painel

1. O documento é escrito (ou alterado) no repositório, no lugar da sua camada.
2. Ele é listado no `DOCUMENTATION.md`, em um grupo (`## Grupo`), no formato `- [Título](caminho) — Resumo`.
3. O script `scripts/sync-docs.mjs` copia exatamente os documentos do índice para `apps/frontend/content/docs`, com
   um `catalog.json` (grupos, títulos, resumos e contagem de palavras). Ele roda sozinho, em modo de observação,
   enquanto o `npm run dev` do frontend está ativo; fora disso, rode `node scripts/sync-docs.mjs`.
4. A cópia é versionada junto com o código: o build e a produção não executam nenhuma etapa de cópia e não precisam
   da raiz do repositório.
5. O painel lê a cópia no servidor, em **Documentação** (`/pt/documentacao`, `/en/documentation`), só para contas com
   a permissão **Documentação** (`documentation:read`; perfis Administrador e Editor-chefe). Enquanto nada foi
   publicado, a página mostra um aviso em vez de um erro.

`node scripts/sync-docs.mjs --check` falha quando a cópia está desatualizada, e um teste (`scripts/sync-docs.test.mjs`)
exige que todo arquivo Markdown do repositório esteja no índice ou na lista de não publicados (`UNPUBLISHED_DOCUMENTS`),
para que nenhum documento fique esquecido.

## A página no painel

- **Índice**: os documentos por grupo, na ordem do `DOCUMENTATION.md`, com o resumo, o arquivo de origem e o tempo de
  leitura; uma busca filtra por título, resumo, arquivo e grupo enquanto se digita (nada sai do navegador).
- **Documento**: o texto com o sumário ao lado (dobrado acima em telas estreitas), blocos de código com destaque de
  sintaxe e botão de copiar, avisos (`> [!NOTE]`, `> [!IMPORTANT]`...) e navegação para o documento anterior e o
  próximo. Os títulos ganham os mesmos identificadores do GitHub, então links com `#seção` continuam funcionando.

## Regras de segurança

- A cópia **nunca** vai para `public/`: os documentos descrevem o interior do portal e só saem pelas páginas
  autenticadas do painel, que conferem a permissão antes de ler qualquer arquivo.
- O painel só abre documentos listados no catálogo: o endereço de um documento é o seu identificador no catálogo,
  nunca um caminho de arquivo.
- O script recusa qualquer coisa que não seja Markdown dentro do repositório e qualquer documento que contenha uma
  credencial real.
- O Markdown é interpretado no servidor com o HTML bruto descartado e renderizado como elementos React, nunca injetado
  como HTML. Um link para outro documento publicado continua dentro do painel; um link para qualquer outro arquivo do
  repositório vira texto simples; imagens mostram só a descrição (nada de fora é carregado).
- Edite sempre o original, nunca a cópia em `apps/frontend/content/docs`.

## A referência de rotas

`docs/architecture/api-routes.md` é gerada por `node scripts/api-routes.mjs`, que lê os controladores da API e lista
método, caminho, permissão exigida e arquivo de cada rota. Depois de criar, remover ou mudar a permissão de uma rota,
rode o script de novo; `node scripts/api-routes.mjs --check` acusa a referência desatualizada.

## Como acrescentar um documento

1. Crie o arquivo na camada certa (`docs/architecture/` para regras, `docs/` para guias).
2. Acrescente a linha no `DOCUMENTATION.md`, no grupo adequado.
3. Se for uma regra nova de uma área, deixe uma linha de resumo no `CLAUDE.md` apontando para o documento e repita-a
   em `.github/copilot-instructions.md`.
4. Rode `node scripts/sync-docs.mjs` (ou deixe o `npm run dev` fazê-lo) e versione o original e a cópia.
