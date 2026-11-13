import { canonicalRichText, parseRichText, RICH_TEXT_MAX_HTML, richTextFromPlain, richTextPlain, serializeRichText } from './rich-text.js';

describe('rich text', () => {
  it('reads the editor output and writes it back unchanged', () => {
    const html = '<p>A <strong>bold</strong>, <em>italic</em> and <u>underlined <strong>mix</strong></u>.<br>Next line</p>'
      + '<ul><li><p>one</p></li><li><p>two</p><ol><li><p>nested</p></li></ol></li></ul><p></p>';
    const blocks = parseRichText(html);
    expect(blocks).not.toBeNull();
    expect(serializeRichText(blocks!)).toBe(html);
    expect(richTextPlain(blocks!)).toBe('A bold, italic and underlined mix.\nNext line\none\ntwo\nnested\n');
  });

  it('decodes entities and escapes text again in the canonical form', () => {
    expect(canonicalRichText('<p>a &amp; b &lt;tag&gt; &quot;q&quot; &#39;s&#x27; &nbsp;x</p>')).toEqual({
      html: '<p>a &amp; b &lt;tag&gt; "q" \'s\' &nbsp;x</p>', text: 'a & b <tag> "q" \'s\'  x',
    });
    // The ordered list's start number and self-closing breaks are accepted and normalized.
    expect(canonicalRichText('<ol start="3"><li><p>c<br/></p></li></ol>')?.html).toBe('<ol><li><p>c<br></p></li></ol>');
  });

  it('drops the empty paragraphs the editor leaves at the end', () => {
    expect(canonicalRichText('<ul><li><p>item</p></li></ul><p></p><p></p>')?.html).toBe('<ul><li><p>item</p></li></ul>');
    expect(canonicalRichText('<p></p><p>kept</p><p> </p>')?.html).toBe('<p></p><p>kept</p><p> </p>');
  });

  it('treats a document without readable text as empty', () => {
    expect(canonicalRichText('<p></p>')).toEqual({ html: '', text: '' });
    expect(canonicalRichText('<p>   </p><p><strong> </strong></p>')).toEqual({ html: '', text: '' });
    expect(canonicalRichText('')).toEqual({ html: '', text: '' });
  });

  it.each([
    ['plain text at the top level', 'Just text'],
    ['an attribute', '<p class="x">text</p>'],
    ['an event handler', '<p onclick="alert(1)">text</p>'],
    ['a script', '<p>text</p><script>alert(1)</script>'],
    ['a link', '<p><a href="javascript:alert(1)">x</a></p>'],
    ['an image', '<p><img src=x onerror=alert(1)></p>'],
    ['a heading', '<h1>text</h1>'],
    ['a comment', '<p>text</p><!-- note -->'],
    ['an unclosed element', '<p><strong>text</p>'],
    ['a stray closing tag', '<p>text</p></p>'],
    ['crossed elements', '<p><strong><em>text</strong></em></p>'],
    ['text inside a list', '<ul>text</ul>'],
    ['a paragraph inside a paragraph', '<p><p>text</p></p>'],
    ['an empty list', '<ul></ul>'],
    ['an empty list item', '<ul><li></li></ul>'],
    ['a block inside a mark', '<p><strong><ul><li><p>x</p></li></ul></strong></p>'],
    ['a bare ampersand', '<p>a & b</p>'],
    ['an unknown entity', '<p>&copy;</p>'],
    ['a surrogate code point', '<p>&#xD800;</p>'],
    ['a stray angle bracket', '<p>a < b</p>'],
    ['uppercase tags', '<P>text</P>'],
  ])('refuses %s', (_name, html) => {
    expect(parseRichText(html)).toBeNull();
    expect(canonicalRichText(html)).toBeNull();
  });

  it('bounds the size and the nesting of a document', () => {
    expect(parseRichText(`<p>${'a'.repeat(RICH_TEXT_MAX_HTML)}</p>`)).toBeNull();
    const nested = (depth: number) => '<ul><li><p>x</p>'.repeat(depth) + '</li></ul>'.repeat(depth);
    expect(parseRichText(nested(10))).not.toBeNull();
    expect(parseRichText(nested(20))).toBeNull();
  });

  it('turns plain text into one escaped paragraph per line', () => {
    expect(richTextFromPlain('First <line> & more\nSecond')).toBe('<p>First &lt;line&gt; &amp; more</p><p>Second</p>');
    expect(canonicalRichText(richTextFromPlain('First\nSecond'))).toEqual({ html: '<p>First</p><p>Second</p>', text: 'First\nSecond' });
  });
});
