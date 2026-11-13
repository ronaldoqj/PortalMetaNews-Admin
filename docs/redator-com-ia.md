# Redator com IA

O redator com IA escreve uma notícia a partir do briefing da redação, prepara as versões em **português e inglês**,
sugere editoria, tags e SEO, cria uma **imagem de capa** e transforma tudo em um **rascunho do construtor** com um clique.
Fica em **Painel → Redação → Redator com IA** (`/redator-ia`) e exige a permissão `ai:use`.

## Como usar

1. Abra **Redator com IA** e escreva o briefing na caixa inferior: os fatos (quem, o quê, quando, onde, por quê),
   números, datas, citações entre aspas com quem disse, e as fontes já checadas. Os exemplos da tela preenchem a caixa.
2. Escolha as opções da redação, que valem para cada pedido:
   - **Idioma** (PT ou EN): o idioma em que o texto é redigido primeiro; a outra versão vem da etapa de preparação.
   - **Tom**: neutro (notícia direta), explicativo, analítico ou leve.
   - **Tamanho**: curta (~250 palavras), média (~500) ou longa (~900).
   - **Gerar imagem de capa**: liga ou desliga a ilustração.
3. Envie (botão ou **Ctrl + Enter**). A resposta aparece em etapas: **Redigindo** (o texto surge ao vivo),
   **Preparando PT e EN** e **Criando a capa**. O botão de parar interrompe a redação; o que já foi escrito fica salvo.
4. Revise a **proposta de notícia**: abas PT | EN com título, linha fina, corpo e SEO; editoria sugerida; tags; capas.
5. Escolha a capa e clique em **Criar rascunho**: a notícia é criada como rascunho, assinada por você, com os dois
   idiomas, editoria, tags, capa e legenda, marcada como "assistida por IA", e o construtor abre em seguida.
6. Para ajustar, continue a conversa ("deixe mais curto", "troque o título por algo mais direto"): cada resposta traz
   uma nova proposta completa.

O texto como foi redigido (Markdown) continua disponível em **Ver o texto como foi redigido**, abaixo de cada proposta.

## Conversa vinculada a uma notícia

Aberto pelo construtor com `?news=<id>` (link **Criar com IA**), o redator cria a conversa **vinculada** àquela notícia.
As propostas passam a oferecer **Aplicar à notícia vinculada**, que substitui título, linha fina, texto, SEO, tags e capa
da notícia existente — o histórico de revisões do construtor guarda a versão anterior.

## Capas

- Cada proposta pode gerar a capa automaticamente; **Gerar outra imagem** cria mais opções, com a descrição editável
  (em inglês funciona melhor). A geração pode levar até dois minutos.
- Toda imagem gerada entra na **Mídia** como "gerada por IA", com o prompt guardado; o site identifica imagens geradas.
- Gerar imagens exige também `media:manage` e um provedor com modelo de imagem.

## Sem provedor de IA (modo local)

Sem chave configurada (fora de produção), o redator funciona em **simulação local**: monta o rascunho a partir do
próprio briefing, marca as traduções com `[EN]`/`[PT]` e desenha uma ilustração abstrata. Nenhum dado sai do servidor.
A tela avisa e leva a **Configurações → Inteligência artificial** para configurar o Gemini.

## Mensagens de erro

| Situação | O que fazer |
| --- | --- |
| Nenhum provedor configurado | Configure a chave em Configurações → Inteligência artificial. |
| IA desativada | Reative o provedor nas configurações. |
| Chave recusada | Confira a chave de API do provedor. |
| Provedor não respondeu | Tente de novo em instantes. |
| Uma resposta ainda está sendo escrita | Aguarde ou pare a resposta atual. |
| Texto redigido, mas não preparado em PT e EN | Peça de novo ou ajuste o briefing. |
| Notícia preparada sem capa | Use **Gerar outra imagem**. |

## Permissões

| Ação | Permissão |
| --- | --- |
| Usar o redator (suas próprias conversas) | `ai:use` |
| Criar rascunho a partir da proposta | `ai:use` + `news:write` |
| Aplicar à notícia vinculada | `ai:use` + poder editar a notícia |
| Gerar imagens de capa | `ai:use` + `media:manage` |

As conversas são de cada conta: ninguém vê as conversas de outra pessoa.

Regras técnicas: [Redator com IA (regras)](architecture/ai-writer.md).
