# Temas e identidade visual

O visual do portal é feito de **temas** (conjuntos completos de tokens de design) e da **identidade visual** (logos,
favicons e imagem de compartilhamento). Tudo é editado no Painel e aparece no site e no painel já na próxima página aberta,
sem publicar código.

## Gerenciador de temas (`/temas`)

Cada tema define:

| Grupo | Tokens |
| --- | --- |
| Cores (modo claro e modo escuro) | primária, secundária, fundo, cartões e painéis, destaques, bordas, texto, texto secundário |
| Campos de formulário | estilo (padrão, preenchido, contorno destacado, sem moldura, em destaque) e cantos/densidade |
| Tipografia | fonte dos títulos e fonte do texto e dos controles (11 opções, todas embarcadas, sem provedor externo) |
| Formas e layout do site | cantos de cartões, botões e imagens; cabeçalho (logo à esquerda ou centralizado); cartões de notícia (planos, com contorno ou com sombra) |

Na lista, cada tema mostra as cores dos dois modos, a fonte dos títulos e os cantos, e onde está ativo:

- **Ativar no site / Ativar no painel**: um tema veste o site e outro o painel (podem ser o mesmo).
- **Editar**: abre o editor com **pré-visualização ao vivo** de uma miniatura do site (cabeçalho, manchete, cartões,
  botão e campo), nos modos claro e escuro, antes de salvar. As cores de texto mostram o contraste com o fundo
  (alerta abaixo de 4,5:1) e o texto sobre os botões é calculado automaticamente.
- **Duplicar** e **Novo tema** (a partir de um tema base).
- **Exportar JSON** e **Importar JSON**: um arquivo `.theme.json` validado antes de virar tema novo (aceita também só os
  tokens). Serve para levar temas entre ambientes ou guardar versões.
- **Excluir**: temas do sistema e temas ativos não podem ser excluídos.

Temas do sistema que acompanham o portal: **Meta News** (site), **Meta News — Painel** (painel), **Jornal clássico** e
**Noturno**. Eles podem ser editados e duplicados, nunca excluídos.

## Identidade visual (`/identidade-visual`)

Cinco imagens, cada uma enviada assim que escolhida (com progresso) e removível de volta à identidade padrão:

| Imagem | Uso | Formato final |
| --- | --- | --- |
| Logo (modo claro) | cabeçalho do site e do painel | WebP até 720 × 200 |
| Logo (modo escuro) | fundos escuros; sem ele, usa-se o claro | WebP até 720 × 200 |
| Favicon (claro) | aba do navegador | PNG 64 × 64 |
| Favicon (escuro) | aba escura do navegador; sem ele, usa-se o claro | PNG 64 × 64 |
| Imagem de compartilhamento | páginas sem foto compartilhadas em redes e mensageiros | JPEG 1200 × 630 |

Aceita PNG, JPG ou WebP de até 5 MB. O servidor regrava cada imagem: nenhum metadado do arquivo original (EXIF, GPS) é guardado.

## Dados do site (`/configuracoes/site`)

Nome do portal, slogan e descrição (em português e inglês), idioma padrão, e-mail de contato (recebe o aviso de cada
mensagem do site) e endereços das redes sociais (Instagram, Facebook, X, YouTube, TikTok, LinkedIn, WhatsApp e Telegram;
em branco, a rede não aparece).

## Permissões

| Tela | Permissão |
| --- | --- |
| Temas e identidade visual | `themes:manage` |
| Dados do site | `site:manage` |

Regras técnicas: [Temas e identidade visual (regras)](architecture/themes-and-branding.md).
