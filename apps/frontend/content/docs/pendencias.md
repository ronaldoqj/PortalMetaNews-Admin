# Pendências

Decisões em aberto e trabalho deixado para depois. O que já foi feito está no [histórico](DEVELOPMENT-HISTORY.md).

## Produto

- **Status HTTP do site.** Endereços inexistentes e trocas de idioma de uma notícia respondem `200` (com `noindex` e
  redirecionamento no navegador), porque a página já começou a ser transmitida quando a decisão é tomada (limite das
  fronteiras de carregamento). Para SEO de produção, avaliar responder `404`/`308` antes do streaming (no proxy, para
  slugs inexistentes, ou sem `loading.tsx` nas rotas de notícia).
- **Slugs alterados depois da publicação** quebram links já compartilhados: guardar os slugs antigos e redirecionar.
- **Recuperação de senha por e-mail** não existe: quem administra a equipe gera uma senha temporária.
- **Newsletter, comentários e notificações da redação** (sino com "enviada para revisão") ficaram fora desta entrega.
- **Mais idiomas:** a lista vive em `i18n/locales.ts` (frontend e API) e nas verificações do banco; acrescentar um idioma
  pede migração e catálogo.
- **Textos legais padrão** precisam de revisão jurídica e dos dados da empresa (campos entre colchetes).

## Engenharia

- Testar no navegador os passos que só existem no cliente: aplicar uma proposta do redator com IA pela tela, escolher
  arquivos nos seletores, o envio do formulário de contato e a sincronização de idiomas digitando no construtor
  (as APIs e a renderização das páginas foram verificadas).
- Configurar uma chave real do Gemini no painel para avaliar a qualidade da redação, da tradução e das imagens; em
  desenvolvimento responde o provedor local determinístico.
- Criar os commits e abrir o PR da branch `feat/portal-meta-news`.
