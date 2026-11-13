import { slugify } from './slug.js';

describe('slugify', () => {
  it.each([
    ['Política & Economia', 'politica-economia'],
    ['  São Paulo: 40°C às 15h!  ', 'sao-paulo-40-c-as-15h'],
    ['Ação — reação', 'acao-reacao'],
    ['', ''],
  ])('%s → %s', (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });

  it('cuts long titles at a word boundary', () => {
    expect(slugify('palavra '.repeat(40), 30)).toBe('palavra-palavra-palavra');
  });
});
