# Administração do painel

Este guia cobre as telas de administração do painel do Portal Meta News: a equipe e os perfis de acesso, o perfil de
cada pessoa, as configurações de integração (inteligência artificial, e-mail e armazenamento), as mensagens dos
leitores, a auditoria, os textos legais do site e a documentação. As regras técnicas da área estão em
[Administração do painel (regras)](architecture/panel-administration.md).

Toda tela aparece no menu só para quem tem a permissão dela. Quem abre o endereço sem a permissão vê o aviso
**Sem permissão** em vez do conteúdo — e, mesmo que a interface mostrasse algo, a API recusaria: cada pedido confere a
permissão de novo.

## Equipe e perfis

Em **Administração → Equipe e perfis** (permissão *Equipe e perfis*) ficam duas abas.

### Contas

Cada pessoa da redação tem a sua conta, com o próprio e-mail. A lista mostra foto (ou iniciais), nome, e-mail, perfil,
situação, quantas notícias assina e o último acesso.

- **Nova conta**: informe nome, e-mail e perfil. O painel gera uma **senha temporária** e a mostra **uma única vez**,
  com botão de copiar. Entregue-a à pessoa por um canal seguro (pessoalmente, um mensageiro com criptografia). O portal
  não envia senhas por e-mail.
- **Primeiro acesso**: quem entra com a senha temporária não chega a abrir o painel; é levado à página *Primeiro
  acesso* e define uma senha definitiva (12 a 128 caracteres, com pelo menos três destes tipos: minúsculas, maiúsculas,
  números e símbolos, sem conter o próprio e-mail). Até lá a conta aparece como **Aguardando 1º acesso**.
- **Editar**: nome, perfil, conta ativa, foto e o **perfil de autor** (cargo e minibiografia, em português e inglês),
  que o site mostra nas assinaturas e na página do autor. O e-mail de acesso não muda: para outro e-mail, crie outra
  conta.
- **Desativar**: a conta deixa de entrar e as sessões abertas terminam na hora; as notícias que ela assina continuam
  publicadas.
- **Gerar senha temporária**: para quem esqueceu a senha. A senha atual deixa de funcionar, as sessões terminam e a
  nova senha aparece uma única vez.
- Ninguém altera o próprio perfil nem desativa a própria conta, e o painel nunca fica sem ao menos uma conta ativa com
  a permissão *Equipe e perfis* (a API recusa a mudança que deixaria o portal sem administração).

### Perfis

Um perfil é um conjunto de permissões. O portal começa com quatro **perfis do sistema**, que podem ganhar permissões
mas nunca perder as originais nem ser excluídos:

| Perfil | Para quem | Permissões originais |
| --- | --- | --- |
| **Administrador** | Quem responde pelo portal | Todas. |
| **Editor-chefe** | Quem edita e publica | Ler, escrever, editar qualquer notícia, publicar, excluir; editorias e tags; mídia; usar a IA; capa; mensagens de leitores; documentação. |
| **Repórter** | Quem escreve | Ler e escrever notícias (as próprias), mídia e usar a IA. |
| **Revisor** | Quem revisa e corrige | Ler e editar qualquer notícia e usar a IA (sem publicar). |

**Novo perfil** cria um perfil personalizado com o nome, a descrição e as permissões que você marcar. Um perfil só pode
ser excluído quando nenhuma conta o usa.

### As permissões

| Grupo | Permissão | O que libera |
| --- | --- | --- |
| Notícias | Ler notícias (`news:read`) | Ver todas as notícias do painel, em qualquer situação, e a visão geral. |
| Notícias | Escrever notícias (`news:write`) | Criar notícias e editar as próprias enquanto estão em rascunho ou revisão. |
| Notícias | Editar qualquer notícia (`news:edit_all`) | Editar notícias de qualquer autor, inclusive publicadas (correções), e trocar a assinatura. |
| Notícias | Publicar (`news:publish`) | Publicar, agendar, despublicar e arquivar. |
| Notícias | Excluir notícias (`news:delete`) | Excluir notícias que não estão publicadas. |
| Conteúdo e redação | Editorias e tags (`taxonomy:manage`) | Criar, editar, ordenar e remover editorias e tags. |
| Conteúdo e redação | Mídia (`media:manage`) | Enviar, descrever, gerar com IA e remover imagens. |
| Conteúdo e redação | Usar a IA (`ai:use`) | Redator com IA e tradução automática do construtor. |
| Conteúdo e redação | Capa (`front_page:manage`) | Manchete, destaques e editorias da página inicial. |
| Site | Temas e identidade visual (`themes:manage`) | Criar e ativar temas; logotipos, favicons e imagem de compartilhamento. |
| Site | Dados do site (`site:manage`) | Nome, descrição, redes sociais e textos legais. |
| Site | Mensagens de leitores (`contacts:read`) | Ler e organizar o que chega pelo formulário de contato. |
| Administração | Equipe e perfis (`users:manage`) | Contas, senhas temporárias, perfis e permissões. |
| Administração | Integrações (`settings:manage`) | Inteligência artificial, e-mail (SMTP) e armazenamento. |
| Administração | Auditoria (`audit:read`) | O registro do que cada conta fez. |
| Administração | Documentação (`documentation:read`) | A documentação técnica publicada no painel. |

Quem tem qualquer permissão de escrita sobre notícias ganha também a de leitura, automaticamente.

## Meu perfil

Pelo menu da conta (canto superior direito) → **Editar perfil**, cada pessoa altera o próprio nome, a foto e o perfil de
autor (cargo e minibiografia nos dois idiomas). O e-mail e o perfil de acesso aparecem, mas são alterados só em
*Equipe e perfis*. A foto aceita PNG, JPG ou WebP de até 5 MB; é recortada em quadrado e regravada sem metadados (EXIF,
GPS).

## Configurações

**Administração → Configurações** reúne, em cartões, as áreas que o seu perfil pode abrir: inteligência artificial,
e-mail e armazenamento (permissão *Integrações*), dados do site e textos legais (*Dados do site*), temas e identidade
visual (*Temas*) e equipe (*Equipe e perfis*).

### Inteligência artificial

Define quem responde à tradução automática, ao redator com IA e à geração de imagens.

- **Provedor**: *Automático* (Gemini quando há chave; sem chave, o provedor local, só fora de produção), *Google
  Gemini*, *Local (simulação)* ou *Desativado*.
- **Chave de API do Gemini**: somente escrita. Depois de salva, é guardada cifrada e nunca mais exibida; deixar em
  branco mantém a chave, e a opção *Remover a chave salva* a apaga. Se o servidor tiver `GEMINI_API_KEY`, ela é usada
  quando não há chave salva no painel.
- **Modelos**: o de texto (padrão `gemini-2.5-flash`) e o de imagem (padrão `gemini-2.5-flash-image`; também aceita
  modelos `imagen-*`). Em branco, valem os padrões.
- **Gerar imagens**: liga ou desliga a geração de capas pelo redator e pela biblioteca de mídia.
- **Manual de estilo da redação**: até 4.000 caracteres que vão em **todo** pedido à IA — tom, grafias, termos
  preferidos, o que evitar.
- **Testar** pede ao provedor a tradução de uma palavra e diz se a configuração funciona. O quadro *Em uso agora* mostra
  o provedor efetivo, os modelos e, quando a IA não responde, o motivo.

O **provedor local** não usa modelo nenhum: marca as traduções com `[EN]`/`[PT]`, monta o rascunho com o próprio texto
do pedido e desenha uma capa abstrata. Serve para testar os fluxos sem custo e sem internet.

### E-mail (SMTP)

O portal envia poucos e-mails: o aviso de nova mensagem de leitor para o e-mail de contato do site e o teste. O envio
começa **desligado**.

- **Enviar e-mails** liga ou desliga tudo. Desligado, as mensagens de leitores continuam chegando ao painel.
- **Servidor SMTP do painel**: servidor, porta (465 com *TLS implícito*; 587, 25 ou 2525 sem), usuário, senha
  (somente escrita, guardada cifrada), e-mail e nome do remetente. Sem servidor aqui, o portal usa o do ambiente
  (`SMTP_*`), se houver.
- **Enviar teste** conecta, autentica e manda uma mensagem de teste para o e-mail da sua conta.

### Armazenamento

Somente leitura: onde ficam as imagens (disco do servidor ou bucket compatível com S3), se o armazenamento responde, o
limite de cada envio e quanto a biblioteca de mídia ocupa (quantidade, espaço e quantas foram geradas por IA). O tipo de
armazenamento e as credenciais são definidos nas variáveis de ambiente da API, nunca no painel.

## Mensagens de leitores

**Site → Mensagens** (permissão *Mensagens de leitores*) recebe o que os leitores enviam pelo formulário *Fale
conosco*: sugestão de pauta, correção, publicidade, imprensa, privacidade ou outro assunto. O menu mostra quantas são
novas.

- A lista filtra por situação (nova, lida, arquivada), assunto e texto, e guarda os filtros no endereço.
- Abrir uma mensagem nova a marca como **lida** (com quem leu e quando). Dali é possível marcá-la como nova de novo,
  arquivá-la ou restaurá-la, e **responder por e-mail** (abre o seu programa de e-mail com o endereço do leitor).
- Do leitor, o portal guarda só o que ele digitou (nome, e-mail, assunto, mensagem e o idioma do site): nunca endereço
  IP ou dados do navegador.

## Auditoria

**Administração → Auditoria** (permissão *Auditoria*) mostra o registro permanente do que cada conta fez: quando,
quem, a ação (em palavras, com o nome técnico abaixo), o resultado e os detalhes (o tipo e o identificador do item e
os campos alterados). Ações automáticas, como uma publicação agendada, aparecem como **Sistema**.

- Filtros: nome da ação (por exemplo `news.published`), resultado, período e identificador do item (para ver toda a
  história de uma notícia, cole o identificador dela).
- O registro não pode ser alterado nem apagado, nem pelo banco de dados. Ele nunca guarda o texto das notícias, senhas,
  chaves ou mensagens: só identificadores e decisões.

## Textos legais

**Site → Textos legais → Privacidade** e **Termos de uso** (permissão *Dados do site*) editam as páginas legais do site,
cada uma com uma edição em **português** e outra em **inglês** (cada página do site mostra a edição do seu idioma).

- O texto é escrito em Markdown (`##` seções, `**negrito**`, listas, tabelas e avisos `> [!IMPORTANT]`); HTML não é
  aceito. **Pré-visualizar** mostra o texto exatamente como o site o exibe.
- Enquanto ninguém editou, vale o **texto padrão** que vem com o código (um modelo para revisão jurídica, com campos
  `[entre colchetes]` para preencher). Salvar publica no site na hora; **Restaurar padrão** descarta o texto
  personalizado.
- *Ver no site* abre a página pública da edição.

## Documentação

**Administração → Documentação** (permissão *Documentação*) publica os guias e as regras do projeto a partir do
repositório. Como funciona e como acrescentar um documento: [A documentação no painel](documentacao-no-painel.md).
