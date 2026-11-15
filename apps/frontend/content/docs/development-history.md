# Histórico de desenvolvimento

O que foi construído, em ordem, e as decisões que orientam o projeto. Pendências ficam em [PENDENCIAS.md](PENDENCIAS.md).

## 2026-11 — Do protótipo multi-tema ao Portal Meta News

O repositório tinha só um protótipo Next.js (Mantine com SCSS, next-intl e um teste de troca de tema). Ele foi substituído
por um portal de notícias completo, com a estrutura do projeto AR Ética — na forma já enxuta da Lora, que derivou dele sem a
criptografia — como referência.

**Decisões de fundação**
- Dois projetos independentes, `apps/backend` (NestJS 12 + PostgreSQL 17) e `apps/frontend` (Next.js 16 + Mantine 7 +
  next-intl), sem `package.json` na raiz, Node 24.20.0.
- Portas terminadas em 27, definidas uma vez no `.env` da raiz: site/painel 3027, API 30027, PostgreSQL 5427 (o AR Ética usa
  31 e a Lora 13, então os três rodam juntos).
- Um único portal (sem multi-tenant): um schema `public`, uma tabela de configurações, um painel. Duas áreas por host: o site
  no domínio e o painel em `painel.`; a API em `api.`, chamada só pelo servidor do frontend.
- Sem criptografia de dados de negócio (decisão do usuário: era exigência do canal de denúncias). Só as credenciais de
  integração (senha SMTP, chave da IA) são cifradas (`SecretCipher`).
- Idiomas `pt` e `en`, como prefixos de rota e como idiomas do conteúdo (`{ pt?, en? }`); uma notícia aparece num idioma só
  se for publicada nele.
- Quatro perfis de sistema — Administrador, Editor-chefe, Repórter, Revisor — sobre 16 permissões; perfis personalizados
  no painel.

**Backend**
- Acesso: contas, sessões opacas com hash, Argon2id, bloqueio após 5 erros, senha temporária com troca obrigatória,
  instalação do primeiro administrador (navegador com token ou variáveis de ambiente), guarda de permissões que nega por padrão.
- Redação: notícias com fluxo rascunho → revisão → agendada/publicada → arquivada, permissões por item, slugs por idioma
  únicos, concorrência otimista (`expectedUpdatedAt`), revisões (até 50 por notícia, com restauração), busca full-text por
  idioma (configurações `pmn_pt`/`pmn_en` sem acentos), agendador, leituras por dia sem rastreamento.
- Corpo das notícias numa gramática HTML estrita (títulos, listas, citações, links e imagens da mídia) espelhada no frontend
  e renderizada como elementos React; saídas da IA passam por um parser tolerante.
- Mídia: imagens reencodadas em quatro variantes (480, 960, 1600 e o recorte 1200x630 para redes sociais), sem metadados.
- IA: provedor Gemini (texto `gemini-2.5-flash`, imagem `gemini-2.5-flash-image` ou Imagen) e provedor local determinístico
  que simula tradução, redação e capas offline; prompts editoriais num só arquivo, com o guia de estilo da redação.
- Redator com IA: conversas por conta, resposta em streaming (SSE), estruturação bilíngue em JSON (título, linha fina, corpo,
  SEO, editoria, tags, prompt de imagem), capa gerada e criação do rascunho no construtor.
- Temas: tokens completos (paletas clara/escura, campos, tipografia, raio, cabeçalho e cartões do site), quatro temas de
  sistema, um ativo para o site e outro para o painel.
- Testes: unitários (216) e de integração com banco descartável (fluxo editorial, publicação por idioma, slugs, tradução,
  mídia, redator com IA, temas, proteção contra perda de acesso).

**Frontend**
- Proxy por host, rotas localizadas, catálogos em partes, tema do SSR por área, sessão do painel em cookie HttpOnly.
- Moldura do painel com menu como dado, contadores (em revisão, mensagens), migalhas e menus de conta e idioma.
- Redação: visão geral (semana contra a anterior, tendência de 30 dias, mais lidas, editorias, meu trabalho, fila de
  revisão, agendadas), lista de notícias por status com filtros na URL, construtor bilíngue (abas PT | EN, editor Tiptap
  limitado à gramática do corpo, capa e imagens da biblioteca, editoria, tags, autor, destaque/urgente, SEO, slug,
  idiomas a publicar com o que falta, fluxo editorial por permissão, salvamento automático com concorrência otimista,
  revisões com pré-visualização e restauração, pré-visualização do artigo), biblioteca de mídia (envio com progresso,
  geração por IA, textos alternativos e legendas bilíngues), editorias, tags e capa.
- **Sincronização de idiomas** no construtor: editar o idioma de origem traduz o campo para o outro após 1,2 s; digitar
  no outro idioma pausa a sincronização (e grava a pausa); "Sincronizar PT → EN" ou "EN → PT" retraduz tudo, pedindo
  confirmação quando o destino já tem texto; se o idioma de origem ainda está vazio, o idioma em que se começa a escrever
  vira a origem. Regras puras testadas (`translation-sync.ts`).
- Redator com IA: conversas próprias, pauta com dicas e exemplos, opções de idioma, tom, tamanho e capa, texto
  transmitido ao vivo em três etapas, cartão da proposta com PT | EN, editoria, tags e galeria de capas, e as ações criar
  rascunho, aplicar à notícia vinculada (`?news=`), gerar outra imagem e abrir rascunho.
- Gerenciador de temas: cartões com amostras e selos, duplicar, criar a partir de um tema base, ativar no site ou no
  painel, exportar e importar `.theme.json`, editor completo com pré-visualização ao vivo do site (claro e escuro).
  Identidade visual (logos, favicons, imagem de compartilhamento) e dados do site (nome, slogan, descrição, idioma
  padrão, e-mail e redes sociais).
- Administração: equipe e perfis (contas com senha temporária, perfis personalizados com as permissões explicadas),
  meu perfil (perfil de autor bilíngue), mensagens dos leitores, auditoria com rótulos por ação, configurações de IA,
  e-mail e armazenamento, textos legais em PT e EN com prévia e restauração, e a documentação viva.
- Site público: capa (manchete, destaques, últimas, blocos por editoria, mais lidas), notícia com assinatura, datas,
  tempo de leitura, compartilhamento por links simples, capa com crédito e selo de IA, corpo, tags, autor e
  relacionadas; listas de últimas, editoria, tag, autor e busca; fale conosco; privacidade e termos; RSS por idioma,
  sitemap com pares de idioma, `robots.txt`, Open Graph, `hreflang`, canônico e `NewsArticle` em JSON-LD; contador de
  leituras por um relay que não guarda nada do leitor.
- Identidade visual da marca: símbolo "M" cobalto com o ponto vermelho de "última hora", logotipo "PORTAL META NEWS"
  desenhado em traços (sem fontes do sistema), versões clara e escura, favicons, ícone Apple e imagem de
  compartilhamento, gerados por `scripts/brand-assets.mjs`.
- Verificação final: tipos e lint limpos nos dois projetos, 127 testes no frontend, 216 unitários e 7 de integração no
  backend, 33 dos scripts da raiz, e todas as páginas do painel (por perfil) e do site renderizadas no servidor de
  desenvolvimento.

**Documentação viva**
- `CLAUDE.md` enxuto → `docs/architecture/*` (regras, inglês) e `docs/*` (guias, português) → `DOCUMENTATION.md` →
  publicada no painel, em Documentação.

## 2026-11 — Listas com duas visões e animações

- Todas as listas do painel passam a oferecer **linhas e cartões**, como no AR Ética, a partir do componente central
  `DataView`: as mesmas colunas desenham as duas visões, e cada coluna diz seu lugar no cartão (`cover`, `title`, `aside`,
  `hidden` ou detalhe rotulado). `useListingView` guarda a escolha de cada lista no navegador e entrega o seletor;
  `ResourceManager` já o traz. Cartões por padrão; a auditoria abre em linhas.
- Visual modernizado e as animações da Lora: cabeçalho discreto em caixa-alta, linhas arejadas com destaque e barra de
  acento ao passar o mouse, ações que aparecem no hover, cartões que se elevam com uma faixa nas cores do tema e capa de
  ponta a ponta; os itens entram um após o outro ao trocar de visão ou de página (`ListingView` faz o mesmo nas grades
  próprias, como a do seletor de mídia), respeitando `prefers-reduced-motion`.
- Listas convertidas: notícias (com miniatura da capa), mídia, temas (com a prévia das cores), contas e perfis,
  editorias e tags, mensagens e auditoria.

## 2026-11 — Site com visual editorial mais moderno

- Cabeçalho: fio com as cores da marca, editorias sublinhadas na própria cor ao passar o mouse (e na editoria aberta),
  busca num painel que se abre sob o cabeçalho, cabeçalho preso que se compacta ao rolar; o seletor de idioma vira só
  o ícone no celular (antes se sobrepunha ao de tema).
- Capa: manchete com o título sobre a capa, destaques com miniaturas à direita, últimas ao lado de *Mais lidas* (com a
  editoria) e *Mais notícias*, e as editorias em colunas numa faixa de largura total — sem os vazios dos blocos antigos
  e sem repetir o que já está no topo.
- Cartões: rótulo de editoria com traço, título que se sublinha ao passar o mouse, imagem que se aproxima, tempo de
  leitura curto com ícone; nos temas com contorno ou elevados a imagem vai de ponta a ponta. No celular as listas
  mantêm o primeiro cartão grande e o resto em linhas com miniatura.
- Notícia: coluna de leitura centrada, capa mais larga com legenda e crédito separados, capitular na cor da editoria,
  barra de progresso de leitura só com CSS, compartilhamento também no fim e *Leia também* em grade de largura total.
- Rodapé com editorias em duas colunas e o aviso de leitura sem rastreamento na linha final.

## 2026-11 — Portal de tecnologia, arquivos no bucket e fotos reais

- O Portal Meta News passa a cobrir tecnologia: a migração `1900000000001-technology-portal` troca o slogan e a descrição
  padrão (só onde a redação ainda não os editou), e os exemplos do painel (prévia de tema, dicas) falam de tecnologia.
- Seed de demonstração refeito (`seed-demo-content.ts`): oito editorias (Inteligência Artificial, Dispositivos,
  Segurança, Negócios, Ciência, Games, Mobilidade, Telecom) e dezesseis notícias fictícias bilíngues.
- Capas: no lugar dos fundos abstratos do provedor local, fotos reais com licença aberta (domínio público, CC0, CC BY,
  CC BY-SA) do Wikimedia Commons, escolhidas uma a uma para cada notícia. `seed-photos.ts` baixa cada foto no momento do
  seed (host fixo, tamanho limitado, recorte 16:9) e grava como qualquer envio, com autor e licença no crédito. Nenhuma
  foto fica no repositório.
- Arquivos: tudo o que o portal guarda já passava pelo `StorageService`; com `STORAGE_DRIVER=s3` vai para o bucket R2
  `portal-meta-news` (prefixo `dev`). `npm run storage:copy-local` leva ao bucket os arquivos de uma instalação que
  começou no disco. Ficam no projeto só a identidade visual padrão (`public/brand`) e a documentação.
- Desenvolvimento migrado: `STORAGE_DRIVER=s3`, arquivos copiados com `storage:copy-local`, seed refeito no bucket e a
  pasta local `apps/backend/storage` removida.

## 2026-11 — Vários estilos editoriais para a IA

- O "Estilo editorial" único (`settings.ai_guidelines`) virou uma lista de estilos com nome e instruções (`ai_styles`),
  com no máximo um padrão. A migração `1900000000002-ai-styles` leva o texto existente para o primeiro estilo, padrão.
- Em *Configurações > Inteligência artificial*: criar, editar, excluir e *Tornar padrão*. O padrão vale para a tradução
  e já vem escolhido em cada nova conversa do redator com IA, que ganhou o menu **Estilo editorial** (outros estilos ou
  *Sem estilo editorial*); a escolha fica guardada na conversa.
- O seed cria três estilos de exemplo (*Padrão da redação*, *Explicativo para iniciantes*, *Análise técnica*).
- Correções no caminho: selos (`Badge`) passam a ser `span` e as descrições ricas de página e seção, `div`, o que
  acabou com o erro de hidratação "`<div>` dentro de `<p>`"; um detalhe sozinho ocupa o cartão inteiro no `DataView`.
