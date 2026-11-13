import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { articleMediaIds, canonicalArticleHtml, lenientArticleHtml, parseArticleHtml, readingMinutes } from './article-html.js';

const MEDIA = '0b0e7a3c-2f1d-4f43-9d50-0e8b8f2c1a11';

describe('article HTML', () => {
  it('accepts what the editor writes and stores it canonically', () => {
    const editor = `<p>Olá <strong>mundo</strong> &amp; <a target="_blank" rel="noopener noreferrer nofollow" href="https://example.org/x?a=1&amp;b=2">link</a></p>`
      + `<h2>Contexto</h2><ul><li><p>um</p></li></ul><blockquote><p>citação</p></blockquote><hr><img src="/media/${MEDIA}/lg" alt="Foto"><p></p>`;
    const canonical = canonicalArticleHtml(editor);
    expect(canonical?.html).toBe(`<p>Olá <strong>mundo</strong> &amp; <a href="https://example.org/x?a=1&amp;b=2">link</a></p>`
      + `<h2>Contexto</h2><ul><li><p>um</p></li></ul><blockquote><p>citação</p></blockquote><hr><img src="/media/${MEDIA}/lg" alt="Foto">`);
    expect(canonical?.text).toBe('Olá mundo & link\nContexto\num\ncitação\nFoto');
    expect(articleMediaIds(parseArticleHtml(canonical!.html)!)).toEqual([MEDIA]);
  });

  it.each([
    '<p onclick="x()">a</p>', '<script>alert(1)</script>', '<p><a href="javascript:alert(1)">x</a></p>', '<img src="https://evil/x.png">',
    '<p><p>nested</p></p>', 'loose text', '<h1>t</h1>', '<p>a</h2>', '<p style="color:red">a</p>',
  ])('refuses %s', (html) => {
    expect(parseArticleHtml(html)).toBeNull();
  });

  it('cleans model output instead of refusing it', () => {
    expect(lenientArticleHtml('<h1>T</h1>\n<p class="x"><b>a</b> <i>b</i></p>\n<div><p>c</p></div><span>d</span>'))
      .toBe('<h2>T</h2><p><strong>a</strong> <em>b</em></p><p>c</p><p>d</p>');
    expect(lenientArticleHtml('<p>a<script>x</script></p>')).toBe('<p>ax</p>');
    expect(lenientArticleHtml('Texto solto')).toBe('<p>Texto solto</p>');
    expect(lenientArticleHtml('<p>a</p>solto <strong>b</strong><h2>c</h2>')).toBe('<p>a</p><p>solto <strong>b</strong></p><h2>c</h2>');
    expect(parseArticleHtml(lenientArticleHtml('<table><tr><td>x</td></tr></table>'))).not.toBeNull();
  });

  it('counts reading time', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('palavra '.repeat(660))).toBe(3);
  });

  it('is mirrored by the frontend grammar', () => {
    const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
    const backend = read('./article-html.ts');
    const frontend = read('../../../../frontend/src/components/forms/article-html.ts');
    for (const name of ['MEDIA_SRC', 'SAFE_HREF', 'TOKEN', 'ATTRIBUTE', 'ENTITY']) {
      const line = new RegExp(`^const ${name} = (.+);$`, 'm').exec(backend)?.[1];
      expect(line).toBeDefined();
      expect(frontend).toContain(`const ${name} = ${line};`);
    }
  });
});
