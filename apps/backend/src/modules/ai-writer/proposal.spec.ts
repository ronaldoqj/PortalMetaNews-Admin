import { normalizeProposal } from './proposal.js';

describe('AI writer proposals', () => {
  const categories = [{ id: '11111111-1111-4111-8111-111111111111', slug: 'politica' }];

  it('bounds, cleans and resolves what the model answered', () => {
    const proposal = normalizeProposal({
      pt: { title: '  Título  ', subtitle: 'Linha fina', body: '<h1>X</h1><p class="a">Corpo</p>', seoTitle: 'x'.repeat(90), seoDescription: 'd', imageCaption: 'c' },
      en: { title: 'Title', subtitle: 'Sub', body: '<p>Body</p>' },
      category: 'politica', tags: [{ pt: 'eleições', en: 'elections' }, { pt: '' }, 'loose'], imagePrompt: 'A ballot box',
    }, categories);
    expect(proposal?.pt.title).toBe('Título');
    expect(proposal?.pt.body).toBe('<h2>X</h2><p>Corpo</p>');
    expect(proposal?.pt.seoTitle).toHaveLength(70);
    expect(proposal?.en.seoDescription).toBe('');
    expect(proposal?.categoryId).toBe(categories[0].id);
    expect(proposal?.tags).toEqual([{ pt: 'eleições', en: 'elections' }]);
  });

  it('refuses an answer without any complete language, and unknown sections', () => {
    expect(normalizeProposal({ pt: { title: 'T' }, en: { body: '<p>B</p>' } }, categories)).toBeNull();
    expect(normalizeProposal({ pt: { title: 'T', body: 'B' }, category: 'sports' }, categories)?.categoryId).toBeNull();
    expect(normalizeProposal('text', categories)).toBeNull();
  });
});
