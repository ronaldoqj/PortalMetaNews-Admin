# Documentação do Portal Meta News

Este é o índice da documentação do projeto e a fonte da página **Documentação** do painel: cada linha abaixo vira um
documento publicado, na ordem e no grupo em que aparece. Como funciona e como acrescentar um documento está em
[A documentação no painel](docs/documentacao-no-painel.md).

## Comece por aqui

Visão geral, ambiente de desenvolvimento e o que cada projeto contém.

- [Visão geral do projeto](README.md) — O que é o Portal Meta News, como subir o ambiente e onde fica cada coisa.
- [Diretrizes do projeto](CLAUDE.md) — O arquivo de contexto enxuto dos assistentes: invariantes do produto, regras gerais e uma linha por área.
- [Portas de desenvolvimento](README-DEV-PORTS.md) — As portas terminadas em 27 (site/painel, API e banco) e onde são definidas.
- [Backend](apps/backend/README.md) — A API NestJS: módulos, banco, comandos e testes.
- [Frontend](apps/frontend/README.md) — O Next.js: áreas, biblioteca de componentes, comandos e testes.
- [Implantação](docs/implantacao.md) — Variáveis, imagens e passos para publicar em produção.
- [Histórico de desenvolvimento](DEVELOPMENT-HISTORY.md) — O que foi construído, em ordem, e as decisões tomadas.
- [Pendências](PENDENCIAS.md) — Decisões em aberto e trabalho deixado para depois.

## Guias do produto

O que cada área faz e como usar, em português.

- [Redação e notícias](docs/redacao-e-noticias.md) — Lista de notícias, construtor bilíngue com tradução sincronizada, fluxo editorial, revisões, mídia, editorias, tags, capa e visão geral.
- [Redator com IA](docs/redator-com-ia.md) — Criar notícias com a IA: pauta, opções, texto e imagem gerados e o rascunho pronto no construtor.
- [Temas e identidade visual](docs/temas-e-identidade-visual.md) — O gerenciador de temas por tokens, a pré-visualização, logos, favicons e dados do site.
- [Identidade visual da marca](docs/identidade-visual.md) — O logotipo, as cores, a tipografia e como regenerar os arquivos da marca.
- [Site público](docs/site-publico.md) — Páginas, capa, idiomas e endereços, busca, RSS, sitemap, SEO e contador de leituras sem rastreamento.
- [Administração do painel](docs/painel-administracao.md) — Equipe e perfis, permissões, meu perfil, configurações, mensagens, auditoria e textos legais.
- [A documentação no painel](docs/documentacao-no-painel.md) — Como esta documentação é publicada e como acrescentar um documento.

## Arquitetura

As regras completas de cada área, em inglês, como as diretrizes: o `CLAUDE.md` traz o resumo e aponta para cá.

- [Desenvolvimento e publicação](docs/architecture/development.md) — Ambiente, portas, banco, dados de demonstração, testes e imagens de produção.
- [Hosts e áreas](docs/architecture/hosts-and-domains.md) — Site, painel e API: quem atende em cada endereço e como o host vira área.
- [Internacionalização](docs/architecture/i18n.md) — Idiomas, rotas localizadas, catálogos em partes e textos bilíngues da redação.
- [Convenções do frontend](docs/architecture/frontend-conventions.md) — Acesso à API, biblioteca de componentes, relays, tema e navegação.
- [Convenções do backend](docs/architecture/backend-conventions.md) — Módulos, controladores, permissões, validação, erros e auditoria.
- [Redação (regras)](docs/architecture/newsroom.md) — Notícias, fluxo editorial, sincronização de idiomas, revisões, mídia, editorias, tags e capa.
- [Redator com IA (regras)](docs/architecture/ai-writer.md) — Provedores, prompts, streaming, proposta estruturada, imagens e aplicação ao construtor.
- [Temas e identidade (regras)](docs/architecture/themes-and-branding.md) — Tokens, temas ativos por área, renderização no SSR e imagens de marca.
- [Site público (regras)](docs/architecture/public-site.md) — Conteúdo publicado por idioma, SEO, feed, sitemap e privacidade dos leitores.
- [Administração do painel (regras)](docs/architecture/panel-administration.md) — Contas, perfis, permissões, configurações, auditoria e documentação.
- [Rotas da API](docs/architecture/api-routes.md) — Referência gerada dos controladores: método, caminho e quem pode chamar.
