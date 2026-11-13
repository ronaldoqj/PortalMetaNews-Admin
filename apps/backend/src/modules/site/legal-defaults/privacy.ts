import type { LegalEditionText } from '../site-legal.js';

/** The default privacy policy of each edition. Fields in [brackets] are filled in through the panel; the text requires legal review before going live. */
export const PRIVACY_DEFAULTS: Record<'pt' | 'en', LegalEditionText> = {
  pt: {
    title: 'Política de Privacidade',
    summary: 'Como o Portal Meta News trata os dados de quem lê, comenta ou fala com a redação.',
    content: `> [!IMPORTANT]
> Este texto deve ser validado por assessoria jurídica antes de ser publicado.

## 1. Quem somos

O Portal Meta News ("Meta News", "nós") é um portal de notícias. Responsável: [razão social, CNPJ e endereço]. Encarregado de dados (DPO): [nome e e-mail].

## 2. O que coletamos

- **Leitura do site**: não exigimos cadastro para ler. Contamos quantas vezes cada notícia é lida, sem guardar endereço IP, identificador do navegador ou qualquer dado que identifique o leitor.
- **Formulário de contato**: nome, e-mail, assunto e a mensagem que você escreve, para respondermos e, se for uma pauta ou correção, para apurar.
- **Preferências do navegador**: guardamos em cookie apenas o idioma e o tema claro/escuro escolhidos, sem finalidade de rastreamento.

## 3. Para que usamos

Para responder a quem nos escreve, apurar sugestões de pauta e correções, e saber quais notícias são mais lidas. Não vendemos nem cedemos dados a terceiros para publicidade.

## 4. Base legal (LGPD)

Execução de procedimentos a pedido do titular (contato) e legítimo interesse (estatística agregada de leitura, sem identificação).

## 5. Por quanto tempo guardamos

Mensagens de contato: pelo tempo necessário para tratá-las e, no máximo, [prazo] meses. Contagens de leitura: indefinidamente, por não identificarem ninguém.

## 6. Seus direitos

Você pode pedir confirmação, acesso, correção ou exclusão dos seus dados escrevendo para [e-mail de privacidade]. Também pode reclamar à ANPD.

## 7. Segurança

Os dados ficam em servidores com acesso restrito à equipe autorizada; senhas da redação são guardadas apenas como hash e cada ação administrativa é registrada.

## 8. Alterações

Esta política pode mudar; a data da última atualização aparece no topo desta página.`,
  },
  en: {
    title: 'Privacy Policy',
    summary: 'How Portal Meta News handles the data of those who read it or write to the newsroom.',
    content: `> [!IMPORTANT]
> This text must be reviewed by legal counsel before it is published.

## 1. Who we are

Portal Meta News ("Meta News", "we") is a news portal. Controller: [company name, registration and address]. Data protection officer: [name and e-mail].

## 2. What we collect

- **Reading the site**: no sign-up is needed to read. We count how many times each article is read, without storing IP addresses, browser identifiers or anything that identifies the reader.
- **Contact form**: your name, e-mail, subject and message, so we can answer and, for a tip or a correction, look into it.
- **Browser preferences**: a cookie keeps only the language and the light/dark theme you chose, never for tracking.

## 3. Why we use it

To answer those who write to us, look into tips and corrections, and know which articles are read the most. We never sell or share data with third parties for advertising.

## 4. Legal basis

Steps taken at your request (contact) and legitimate interest (aggregate, anonymous reading statistics).

## 5. How long we keep it

Contact messages: as long as needed to handle them and at most [period] months. Reading counts: indefinitely, as they identify no one.

## 6. Your rights

You may ask to access, correct or erase your data by writing to [privacy e-mail], and complain to your data protection authority.

## 7. Security

Data is kept on servers whose access is restricted to the authorized team; newsroom passwords are stored only as hashes and every administrative action is recorded.

## 8. Changes

This policy may change; the date of the last update is shown at the top of this page.`,
  },
};
