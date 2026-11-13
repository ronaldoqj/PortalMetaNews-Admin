import { detectImageType } from '../storage/file-types.js';
import { LocalProvider, localArticle, simulateTranslation } from './local-provider.js';

describe('local provider', () => {
  const provider = new LocalProvider(0);

  it('marks translations without touching the markup', () => {
    expect(simulateTranslation('Política', 'plain', 'en')).toBe('[EN] Política');
    expect(simulateTranslation('[EN] Politics', 'plain', 'pt')).toBe('[PT] Politics');
    expect(simulateTranslation('<p>Olá <strong>mundo</strong></p><p>Fim</p>', 'html', 'en')).toBe('<p>[EN] Olá <strong>mundo</strong></p><p>Fim</p>');
    expect(simulateTranslation('<h2 >X</h2>', 'html', 'en')).toBe('<h2 >[EN] X</h2>');
    expect(simulateTranslation('', 'plain', 'en')).toBe('');
  });

  it('arranges the brief as an article and structures it in both languages', async () => {
    const brief = 'A prefeitura anunciou uma nova linha de ônibus. O trajeto liga o centro ao aeroporto. A operação começa em março. O preço será o mesmo.';
    let article = '';
    for await (const piece of provider.write({ system: '', language: 'pt', turns: [{ role: 'user', content: brief }] })) article += piece;
    expect(article).toBe(localArticle(brief, 'pt'));
    expect(article.startsWith('# A prefeitura anunciou uma nova linha de ônibus')).toBe(true);
    const structured = await provider.structure({ system: '', prompt: '', schema: {}, article }) as Record<string, { title: string; body: string }>;
    expect(structured.pt.title).toBe('A prefeitura anunciou uma nova linha de ônibus');
    expect(structured.en.title).toBe('[EN] A prefeitura anunciou uma nova linha de ônibus');
    expect(structured.pt.body).toMatch(/^<p>/);
    expect(structured.pt.body).toContain('<h2>Contexto</h2>');
  });

  it('draws a deterministic placeholder image', async () => {
    const first = await provider.image({ prompt: 'ônibus' });
    expect(detectImageType(first.data)).toBe('image/png');
    expect((await provider.image({ prompt: 'ônibus' })).data.equals(first.data)).toBe(true);
  });
});
