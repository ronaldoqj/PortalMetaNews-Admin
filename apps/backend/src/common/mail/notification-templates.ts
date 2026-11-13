/**
 * Transactional e-mail templates. SMTP is plain text on the wire and inboxes are shared, so these messages say only
 * that something awaits in the panel: they never carry a reader's message, an unpublished article or a credential.
 */
export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Names typed by people are escaped before they reach HTML. */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ESCAPES[character]);

/** A message of plain paragraphs: no external resource, image or tracking pixel. An empty paragraph is a rule. */
export function renderMail(subject: string, paragraphs: readonly string[]): MailContent {
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0b1324;line-height:1.55">${
    paragraphs.map((paragraph) => paragraph ? `<p>${escapeHtml(paragraph)}</p>` : '<hr style="border:0;border-top:1px solid #dde3ec">').join('')
  }</body></html>`;
  return { subject, text: paragraphs.map((paragraph) => paragraph || '---').join('\n\n'), html };
}

/** To the portal's contact address: a reader wrote through the site. */
export function contactReceivedTemplate(site: string): MailContent {
  return renderMail(`${site}: nova mensagem pelo site`, [
    'Um leitor enviou uma mensagem pelo formulário de contato do site.', 'Acesse o painel, em Mensagens, para ler e responder.',
  ]);
}

/** The test the panel sends to prove the relay works. */
export function testTemplate(site: string): MailContent {
  return renderMail(`${site}: teste de e-mail`, ['Este é um e-mail de teste enviado pelo painel.', 'Se você o recebeu, o envio está configurado corretamente.']);
}
