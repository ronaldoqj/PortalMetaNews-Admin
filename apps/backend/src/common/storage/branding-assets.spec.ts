import { BRANDING_ASSET_SLOTS, brandingAssetFile, brandingAssetKey, parseBrandingAssetFile } from './branding-assets.js';

describe('brand image keys', () => {
  it.each(BRANDING_ASSET_SLOTS)('gives the %s slot a fresh random key it recognizes again', (slot) => {
    const first = brandingAssetKey(slot);
    expect(first).toMatch(/^site\/assets\/branding\/[a-z]+-[0-9a-f]{32}\.(webp|png|jpg)$/);
    expect(brandingAssetKey(slot)).not.toBe(first);
    expect(parseBrandingAssetFile(brandingAssetFile(first))?.slot).toBe(slot);
  });

  it.each(['logo-0.webp', 'favicon-' + 'a'.repeat(32) + '.webp', '../logo-' + 'a'.repeat(32) + '.webp', 'social-' + 'a'.repeat(32) + '.png'])(
    'refuses the file name %s', (file) => {
      expect(parseBrandingAssetFile(file)).toBeUndefined();
    });
});
