# Site público

O site é o portal de notícias que o leitor vê, em `localhost:3027` no desenvolvimento e no domínio raiz em produção
(`SITE_DOMAIN`). Ele é todo renderizado no servidor do frontend, que lê a API pública (`/public/...`); o navegador do
leitor nunca fala com a API. As regras técnicas estão em [Site público (regras)](architecture/public-site.md).

## Páginas

| Página | Português | Inglês |
| --- | --- | --- |
| Capa | `/pt` | `/en` |
| Notícia | `/pt/noticia/<slug>` | `/en/news/<slug>` |
| Últimas notícias | `/pt/ultimas` | `/en/latest` |
| Editoria | `/pt/editoria/<slug>` | `/en/section/<slug>` |
| Tag | `/pt/tag/<slug>` | `/en/tag/<slug>` |
| Autor | `/pt/autor/<id>` | `/en/author/<id>` |
| Busca | `/pt/busca?q=...` | `/en/search?q=...` |
| Fale conosco | `/pt/fale-conosco` | `/en/contact` |
| Privacidade e termos | `/pt/privacidade`, `/pt/termos-de-uso` | `/en/privacy`, `/en/terms-of-use` |
| Feed RSS | `/feed/pt` | `/feed/en` |
| Mapa do site | `/sitemap.xml` (as duas línguas) | |

O endereço sem idioma (`/`) abre no idioma escolhido antes pelo leitor (cookie do next-intl), senão no do navegador,
senão em português.

## Cabeçalho, rodapé e faixa de urgente

- **Barra superior**: um fio com as duas cores da marca, a data de hoje, o seletor de tema (claro, escuro ou automático)
  e o de idioma (no celular, só o ícone).
- **Cabeçalho**: logotipo, "Últimas", as editorias marcadas para o menu (na ordem do painel) e a lupa da busca, que abre
  um painel com o campo logo abaixo do cabeçalho (`Esc` fecha). Passar o mouse sobre uma editoria, ou estar nela,
  desenha um traço na cor da editoria. O cabeçalho fica preso no topo e se compacta ao rolar a página. No celular as
  editorias vão para uma gaveta lateral. Com o tema de cabeçalho **centralizado**, o logotipo e o slogan ficam no
  centro e as editorias numa linha abaixo.
- **Faixa de urgente**: as notícias marcadas como *urgente* publicadas nos últimos dois dias, na cor de destaque do
  tema, no topo de todas as páginas, com o selo "Urgente" pulsando. Some sozinha quando não há nenhuma.
- **Rodapé**: descrição do portal, redes sociais (as configuradas em *Dados do site*), editorias em duas colunas, páginas
  institucionais, o link do RSS e, na última linha, o aviso de leitura sem rastreamento.

## Capa

1. **Manchete** e até **quatro destaques**: os que a editoria fixou em *Capa* no painel; o que faltar é completado com
   as notícias marcadas como *destaque* mais recentes e, depois, com as mais recentes. A manchete aparece com o título
   sobre a própria capa (sobre uma sombra na cor do tema); sem capa, num bloco de texto. Ao lado, o primeiro destaque
   com imagem e os demais em linhas com a miniatura à direita.
2. **Últimas notícias**: as seis mais novas (fora da manchete e dos destaques), com link para a lista completa. Ao lado,
   **Mais lidas** (as cinco mais lidas dos últimos sete dias, numeradas, com a editoria) e **Mais notícias** (as
   seguintes, só o título).
3. **Editorias**: as escolhidas em *Capa* (sem escolha, as quatro primeiras ativas), lado a lado numa faixa de largura
   total, cada uma com o traço da sua cor, uma notícia com imagem, até três títulos e o link "Mais em ...". Uma
   editoria mostra primeiro o que ainda não apareceu no topo da capa; só repete uma notícia se não tiver outra.

Cada cartão mostra a capa (em tamanhos responsivos, com a cor dominante da imagem enquanto ela carrega), a editoria na
sua cor (ou **Urgente**), o título, a linha fina, quando foi publicada ("há 3 horas" nas últimas 24 h, depois a data) e o
tempo de leitura. Uma capa gerada por IA leva o selo **IA**. Ao passar o mouse, a imagem se aproxima e o título se
sublinha. O estilo dos cartões (sem moldura, com contorno ou elevado, com a imagem de ponta a ponta) vem do tema
ativo. No celular, as listas mantêm o primeiro cartão grande e mostram os outros em linhas com miniatura.

## Notícia

Editoria, título, linha fina, assinatura (foto, nome com link para a página do autor, cargo), datas de publicação e de
atualização, tempo de leitura e botões de compartilhamento (WhatsApp, X, Facebook, LinkedIn e copiar link — links
simples, sem scripts das redes). Depois a capa, mais larga que o texto, com legenda e crédito (marcada como **Imagem
gerada por IA** quando for o caso), o texto numa coluna de leitura com letra capitular na cor da editoria, as tags, o
compartilhamento de novo, o quadro *Sobre o autor* e, numa faixa de largura total no fim, *Leia também* (até quatro da
mesma editoria). Uma barra fina no topo da tela mostra quanto da página já foi lido (desenhada pelo próprio navegador, sem
script; navegadores sem suporte simplesmente não a mostram). Uma notícia produzida com apoio do redator com IA mostra um
aviso ao leitor no fim do texto.

## Dois idiomas

- Cada notícia existe em cada idioma em que foi **publicada** (escolha feita no construtor): uma notícia só em português
  não aparece em nenhuma lista nem busca do site em inglês.
- O seletor de idioma leva à **mesma página** no outro idioma. Numa notícia, editoria ou tag, o endereço muda de
  idioma (o slug é outro): a página encontra sozinha o endereço certo e redireciona. Se a notícia não foi publicada no
  outro idioma, o leitor vai para a capa desse idioma.
- Cada página informa aos buscadores o seu endereço no outro idioma (`hreflang`) e o endereço canônico.

## Busca

Procura nas notícias publicadas no idioma da página: palavras do título, da linha fina e do texto, sem diferenciar
acentos nem maiúsculas, com radicais da língua (busca por "eleição" encontra "eleições"). Os resultados vêm pelos mais
relevantes, 12 por página. A página de resultados não é indexada pelos buscadores.

## SEO e compartilhamento

- Título, descrição, endereço canônico e `hreflang` em todas as páginas.
- Open Graph e Twitter Card com imagem: a capa da notícia no formato de compartilhamento (1200 × 630, `/media/<id>/og`)
  ou a imagem padrão do portal (*Identidade visual*).
- Dados estruturados `NewsArticle` (schema.org) em cada notícia e `WebSite` com caixa de busca na capa, para o Google
  Notícias e outros agregadores.
- `/sitemap.xml` com capa, últimas, editorias e todas as notícias publicadas, cada uma com o seu par no outro idioma;
  `/robots.txt` aponta o mapa no site e fecha o painel inteiro para os buscadores.
- `/feed/pt` e `/feed/en`: RSS 2.0 com as 30 notícias mais novas de cada idioma (título, link, data, linha fina,
  editoria, autor e capa).

## Contador de leituras sem rastreamento

Ao abrir uma notícia o navegador envia um único aviso de leitura ao próprio site, que o repassa à API sem nenhum dado do
leitor (nem IP, nem navegador, nem cookie). A API guarda só uma contagem por dia e por notícia, usada nas *Mais lidas*
e no painel. Recarregar a página na mesma aba não conta de novo; robôs que não executam scripts não contam.

## Fale conosco

Formulário com nome, e-mail, assunto (sugestão de pauta, correção, publicidade, imprensa, privacidade, outro) e mensagem
com formatação simples. A mensagem chega ao painel em *Mensagens* (e um aviso por e-mail ao endereço de contato, se o
e-mail estiver configurado). Um campo invisível pega robôs e há um limite de envios por minuto para todos os leitores
juntos; nada que identifique o leitor além do que ele digitou é guardado.

## Privacidade e termos

Os textos vêm do painel (*Textos legais*), uma edição por idioma; sem edição própria, valem os textos padrão do projeto
(que pedem revisão jurídica antes de publicar). O texto é Markdown renderizado com segurança, com sumário lateral.

## Sem a API

Se a API não responder, o site ainda abre com a identidade visual do pacote e sem menu; as páginas que dependem de
notícias mostram a página de erro com opção de tentar de novo.
