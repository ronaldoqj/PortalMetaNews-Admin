import sharp from 'sharp';
import { MEDIA_VARIANT_NAMES, isMediaVariant, mediaVariantKey, renderMediaImage } from './media-images.js';

describe('media renditions', () => {
  it('writes every rendition without enlarging a small image', async () => {
    const input = await sharp({ create: { width: 640, height: 360, channels: 3, background: '#1d4ed8' } }).png().toBuffer();
    const rendered = await renderMediaImage(input, 5_000_000);
    expect(rendered).toMatchObject({ width: 640, height: 360 });
    expect(rendered.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(Object.keys(rendered.variants).sort()).toEqual([...MEDIA_VARIANT_NAMES].sort());
    expect((await sharp(rendered.variants.lg).metadata()).width).toBe(640);
    expect(await sharp(rendered.variants.og).metadata()).toMatchObject({ width: 1200, height: 630, format: 'jpeg' });
  });

  it('refuses markup and oversized uploads', async () => {
    await expect(renderMediaImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 1000)).rejects.toThrow('Only PNG');
    await expect(renderMediaImage(Buffer.alloc(2000, 1), 1000)).rejects.toThrow('size limit');
  });

  it('keys each rendition under its media folder', () => {
    const id = '0b0e7a3c-2f1d-4f43-9d50-0e8b8f2c1a11';
    expect(mediaVariantKey(id, 'md')).toBe(`media/${id}/md.webp`);
    expect(mediaVariantKey(id, 'og')).toBe(`media/${id}/og.jpg`);
    expect(() => mediaVariantKey('../x', 'md')).toThrow();
    expect(isMediaVariant('xl')).toBe(false);
  });
});
