# Redação e notícias

Guia do dia a dia da redação no Painel: a lista de notícias, o construtor bilíngue com tradução automática, o fluxo de
publicação, o histórico de versões, a biblioteca de mídia, editorias e tags, a capa do site e a visão geral. As regras
técnicas desta área estão em [Redação (regras)](architecture/newsroom.md).

## Visão geral (`/dashboard`)

A primeira tela do Painel resume a redação:

- **Publicadas** e **Leituras** dos últimos 7 dias, com a variação contra a semana anterior.
- **Em revisão** (esperando um editor), **Agendadas** (entram no ar sozinhas) e **Com IA** (criadas com o redator com IA).
- **Últimos 30 dias**: leituras por dia e notícias publicadas por dia.
- **Editorias**: quantas notícias publicadas cada editoria tem.
- **Mais lidas da semana**, **Meu trabalho** (seus rascunhos, revisões e agendamentos), **Aguardando revisão** (só para quem
  revisa ou publica), **Próximas publicações** e o atalho para as **mensagens de leitores** não lidas.

As leituras são contadas por dia, sem guardar nada sobre quem leu. Os botões **Nova notícia** e **Criar com IA** abrem o
construtor vazio ou o redator com IA.

## Lista de notícias (`/noticias`)

- **Abas por situação** com a contagem de cada uma: Todas, Rascunhos, Em revisão, Agendadas, Publicadas e Arquivadas.
- **Busca pelo título** (nos dois idiomas, sem diferenciar acentos), filtro por **editoria**, **Só as minhas** e ordem por
  última edição, publicação ou leituras. Filtros e página ficam no endereço, então um link reproduz a mesma lista.
- Cada linha mostra os idiomas em que a notícia é publicada (PT/EN), as marcas de **Urgente**, **Destaque** e **IA**, a
  situação, a editoria, o autor, a data e as leituras.
- O menu de cada linha só oferece o que a sua conta pode fazer com aquela notícia: editar ou abrir, publicar, despublicar,
  arquivar, restaurar e excluir (sempre com confirmação). O número ao lado de **Notícias** no menu é a fila de revisão.

## Construtor de notícias (`/noticias/<id>`)

**Nova notícia** cria um rascunho assinado por você e abre o construtor. A tela tem a coluna do conteúdo e, ao lado, a
publicação e as configurações.

### Conteúdo nos dois idiomas

As abas **Português** e **Inglês** têm os mesmos campos: título, linha fina, texto da notícia, legenda da foto de capa e,
em **Endereço e buscadores**, o endereço (slug), o título e a descrição para buscadores (com contador de caracteres).

O texto usa um editor com negrito, itálico, sublinhado, tachado, intertítulos (H2 e H3), listas, citação, separador,
links e **imagens da biblioteca** (o botão de imagem abre a biblioteca, o envio ou a geração com IA). Formatações que o
site não exibe (código, outros títulos, estilos colados de outros sites, imagens externas) não entram no texto.

**Pré-visualizar** mostra o idioma da aba como o site vai exibi-lo.

### Tradução automática entre os idiomas

Enquanto a sincronização está ativa, a faixa azul diz a direção (por exemplo “o que você escreve em PT é traduzido para
EN”) e cada campo que você escreve no idioma de **origem** é traduzido para o outro idioma pouco mais de um segundo depois
que você para de digitar. O campo traduzido mostra “traduzindo…” e depois a marca **tradução automática**, que some
quando alguém o edita à mão.

- **Começou a escrever no outro idioma?** A sincronização **pausa** sozinha para não apagar a sua revisão, e a faixa
  amarela oferece dois botões: **Sincronizar PT → EN** (volta a traduzir a partir do português) e **Sincronizar EN → PT**
  (passa a traduzir a partir do inglês). Retomar traduz todos os campos de uma vez e substitui o outro idioma — o
  Painel pede confirmação antes, porque o que foi editado à mão no outro idioma será sobrescrito.
- **Notícia nova escrita direto em inglês?** Se o idioma de origem ainda está totalmente vazio, o idioma em que você
  começou a escrever vira a origem, sem pausar.
- O interruptor **Sincronizar** desliga a tradução quando quiser; o estado (ligada ou pausada, e a direção) é salvo com
  a notícia.
- Sem provedor de IA configurado, a faixa avisa que a tradução está desligada e leva a **Configurações → Inteligência
  artificial**. No ambiente de desenvolvimento sem chave, o provedor local **simula** a tradução marcando o texto com
  “[EN] …” ou “[PT] …”, só para mostrar o fluxo funcionando.

### Salvamento, conflitos e histórico

- **Salvar** grava na hora; além disso, alterações pendentes são salvas sozinhas a cada 20 segundos e quando você sai de
  um campo. O topo mostra “Alterações não salvas”, “Salvando…” ou “Salvo há …”, e o navegador avisa se você tentar sair com
  algo não salvo.
- Se outra pessoa salvou a mesma notícia depois que você a abriu, o Painel **não sobrescreve** o trabalho dela: aparece um
  aviso para recarregar a versão atual.
- **Histórico** lista as versões salvas (as 50 mais recentes), com quem salvou e por quê; cada uma pode ser lida e
  **restaurada** (a restauração vira uma nova versão, então também pode ser desfeita).

### Publicação e fluxo editorial

| Situação | O que significa | Quem move |
| --- | --- | --- |
| Rascunho | Em produção, só no Painel | Autor envia para revisão; editor publica ou agenda |
| Em revisão | Pronta para um editor | Editor/revisor devolve para rascunho; editor publica ou agenda |
| Agendada | Entra no ar sozinha na data marcada | Editor publica agora, reagenda ou despublica |
| Publicada | No site, nos idiomas marcados | Editor despublica ou arquiva |
| Arquivada | Fora das listas e do site, guardada | Editor publica de novo ou restaura como rascunho |

- **Idiomas**: marque em quais idiomas a notícia é publicada. Cada idioma marcado precisa de título e texto (o painel mostra
  “Falta: título, texto”); o endereço é gerado do título ao salvar.
- **Agendar** pede data e hora (no fuso do seu navegador); o servidor publica no horário, mesmo com o Painel fechado.
- Notícias publicadas mostram os links **Ver no site** de cada idioma. Mudar o endereço de uma notícia já publicada quebra
  links compartilhados — o campo avisa.
- Ao lado ficam ainda a **editoria**, as **tags** (busque ou crie na hora), a **assinatura** (só editores trocam), a **foto
  de capa** (da biblioteca, de um envio ou gerada com IA), **Destaque na capa** e **Urgente** (faixa de urgentes por dois
  dias), o tempo de leitura por idioma e as leituras.
- **Abrir o redator com IA** leva ao redator já ligado a esta notícia, para pedir um rascunho, uma nova versão ou outra capa.

### Quem pode o quê

| Perfil | Notícias |
| --- | --- |
| Repórter | Lê todas; cria e edita **as próprias** enquanto são rascunho ou estão em revisão; envia para revisão |
| Revisor | Lê e edita **qualquer** notícia, inclusive publicadas (correções), e devolve para rascunho; não publica |
| Editor-chefe | Tudo do revisor, mais publicar, agendar, despublicar, arquivar e excluir; cuida da capa, editorias e mídia |
| Administrador | Tudo |

Notícias publicadas não podem ser excluídas: despublique ou arquive antes. Toda mudança de situação fica na auditoria.

## Biblioteca de mídia (`/midia`)

- Grade com todas as imagens, busca por título, descrição ou crédito, e filtro por origem (**Enviadas** ou **Geradas por IA**).
- **Enviar imagens**: arraste PNG, JPG ou WebP (com o crédito, se quiser). Cada imagem é regravada sem metadados (EXIF, GPS)
  em três larguras para o site e num recorte 1200 × 630 para redes sociais; o original não é guardado.
- **Gerar com IA**: descreva a imagem; ela entra na biblioteca marcada como gerada por IA, com o pedido feito guardado. Sem
  provedor de imagens, o botão explica por quê; no desenvolvimento sem chave, o provedor local desenha uma ilustração
  abstrata provisória.
- Clicar numa imagem abre os detalhes: título interno, **texto alternativo** e **legenda** nos dois idiomas, crédito, tamanho,
  em quantas notícias é usada e quem adicionou. Uma imagem usada como capa ou dentro de um texto não pode ser excluída.

## Editorias (`/editorias`) e tags (`/tags`)

- **Editorias** têm nome e descrição nos dois idiomas, endereço em cada idioma (gerado do nome quando em branco), cor,
  ativa/inativa e “mostrar no menu”. A ordem da lista (setas) é a ordem do menu do site. Só editorias sem notícias podem ser
  excluídas — desative as demais.
- **Tags** têm nome e endereço nos dois idiomas e mostram em quantas notícias aparecem. Repórteres também criam tags direto
  no construtor. Excluir uma tag só a tira das notícias.

## Capa (`/capa`)

Escolha a **manchete**, até **4 destaques** (na ordem) e até **8 editorias** exibidas em blocos na página inicial. A busca
mostra só notícias publicadas. A prévia ao lado mostra a montagem. O que ficar vazio é preenchido pelo site: primeiro as
notícias marcadas como destaque, depois as mais recentes; sem editorias escolhidas, entram as quatro primeiras do menu.
