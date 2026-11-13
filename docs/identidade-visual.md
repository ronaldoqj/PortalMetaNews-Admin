# Identidade visual do Portal Meta News

A marca do portal: um símbolo que é ao mesmo tempo a inicial **M** e o "pulso" da notícia, com o ponto vermelho do
**urgente** no canto, e o nome escrito com traços geométricos firmes. Sóbria como um jornal, viva como um alerta.

## Conceito

- **Símbolo**: um quadrado de cantos arredondados em cobalto com um "M" branco desenhado como uma linha de sinal (subida,
  vale, subida). No canto superior direito, um ponto vermelho, contornado pela cor do fundo, lembra o aviso de notícia
  urgente que chega ao leitor.
- **Logotipo**: o símbolo ao lado do nome **META NEWS** (META em tinta, NEWS em cobalto) com o pequeno sobretítulo
  **PORTAL** em vermelho, espaçado como uma chamada de capa.
- As letras são desenhadas com traços (sem fonte do sistema): o resultado é igual em qualquer máquina e as diagonais
  terminam retas na linha de base e na altura das maiúsculas, como numa fonte desenhada.

## Versões e arquivos

Gerados por `node scripts/brand-assets.mjs` (usa o `sharp` de `apps/backend/node_modules`) em `apps/frontend/public`:

| Arquivo | Uso |
| --- | --- |
| `brand/logo-light.png` | Logotipo horizontal para fundos claros (1200 px de largura, fundo transparente). |
| `brand/logo-dark.png` | Logotipo horizontal para fundos escuros (NEWS e o símbolo em cobalto claro). |
| `brand/symbol.png` | O símbolo sozinho, 512 px, para perfis de redes sociais e materiais avulsos. |
| `brand/favicon.png`, `brand/favicon-dark.png` | Favicons de 32 px para o tema claro e o escuro do navegador. |
| `brand/apple-icon.png` | Ícone de 180 px para a tela inicial do iPhone (fundo cheio, sem cantos). |
| `brand/social.jpg` | Imagem padrão de compartilhamento (1200 × 630) quando a notícia não tem capa. |
| `favicon.ico` | Favicon clássico com 16, 32 e 48 px. |

Nos favicons de 16-32 px o contorno do ponto vermelho é omitido: nesse tamanho ele viraria um fio e borraria o ponto.

## Área de respiro e tamanho mínimo

- Mantenha em volta do logotipo um espaço livre igual à altura do ponto vermelho (cerca de 1/5 da altura do símbolo).
- Tamanho mínimo do logotipo horizontal: 120 px de largura na tela. Abaixo disso, use só o símbolo.
- O símbolo continua legível a 16 px (favicon).

## Cores (tokens do tema "Meta News")

As cores da marca são as do tema padrão. No código use sempre os tokens, nunca o hexadecimal.

| Papel | Token | Claro | Escuro |
| --- | --- | --- | --- |
| Cobalto (marca) | `--app-primary` | `#0F3D91` | `#7EA6FF` |
| Vermelho de sinal (urgente) | `--app-secondary` | `#E63946` | `#FF6B76` |
| Fundo | `--app-background` | `#F7F8FA` | `#0A0F1A` |
| Superfície | `--app-surface` | `#FFFFFF` | `#111827` |
| Realce | `--app-highlight` | `#EEF2F8` | `#1A2333` |
| Borda | `--app-border` | `#DDE3EC` | `#273246` |
| Tinta (texto) | `--app-ink` | `#0B1324` | `#F2F5FA` |
| Texto secundário | `--app-muted` | `#5B6577` | `#9AA6B8` |

O vermelho é reservado ao que é urgente e a pequenos acentos (o ponto, a faixa de notícias urgentes, as aspas das
citações): não o use em grandes áreas nem em textos longos.

## Tipografia

- **Títulos**: Newsreader (serifada, editorial) — `var(--mantine-font-family-headings)`.
- **Texto e interface**: Inter — `var(--mantine-font-family)`.
- O painel usa Manrope nos dois papéis (tema "Meta News — Painel"). As fontes são arquivos do próprio projeto
  (`apps/frontend/src/app/fonts`), nenhuma página consulta um provedor externo de fontes.

## Uso

- Faça: use o logotipo claro sobre fundos claros e o escuro sobre fundos escuros (o componente `BrandLogo` troca sozinho
  conforme o tema do leitor); use o símbolo sozinho em espaços quadrados.
- Não faça: distorcer, girar, mudar as cores fora dos tokens, trocar as letras por uma fonte, separar o ponto vermelho do
  símbolo, aplicar sombras ou contornos, colocar o logotipo sobre fotos sem uma área calma de fundo.

## Como mudar

- **Cores, tipografia, cantos e layout** de site e painel: no painel, em **Temas** (gerenciador de temas). Cada tema é um
  conjunto completo de tokens; ativar outro tema para o site muda as cores de todas as páginas na próxima visita, sem
  publicar código. Os arquivos de imagem da marca não mudam com o tema.
- **Logotipos, favicons e imagem de compartilhamento**: no painel, em **Identidade visual**. Uma imagem enviada ali
  substitui a do pacote em todo o site e no painel (o par claro/escuro: enviar só uma versão vale para os dois temas).
- **A marca padrão do projeto**: edite as formas e cores em `scripts/brand-assets.mjs` e rode
  `node scripts/brand-assets.mjs`. Não edite os PNG à mão: eles são sempre regenerados pelo script.
