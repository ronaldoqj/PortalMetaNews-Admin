import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import sharp from 'sharp';
import { AVATAR_MAX_BYTES, renderAvatarImage } from './avatar-image.js';

const MARKER = 'MEMBER-IDENTITY-MARKER';

describe('avatar image rendering', () => {
  it('crops to a clean 256x256 WebP without EXIF, GPS or XMP', async () => {
    const input = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 80, b: 160 } } }).jpeg()
      .withExif({ IFD0: { Artist: MARKER }, IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '23/1 32/1 0/1' } })
      .withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/"><dc:creator>${MARKER}</dc:creator></x:xmpmeta>`)
      .toBuffer();
    const output = await renderAvatarImage(input);
    const metadata = await sharp(output).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 256, height: 256 });
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(output.toString('latin1')).not.toContain(MARKER);
  });

  it('rejects markup, empty, oversized and undecodable payloads', async () => {
    await expect(renderAvatarImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    await expect(renderAvatarImage(Buffer.alloc(0))).rejects.toBeInstanceOf(BadRequestException);
    await expect(renderAvatarImage(Buffer.alloc(AVATAR_MAX_BYTES + 1))).rejects.toBeInstanceOf(PayloadTooLargeException);
    const truncated = (await sharp({ create: { width: 40, height: 40, channels: 3, background: '#000' } }).png().toBuffer()).subarray(0, 40);
    await expect(renderAvatarImage(truncated)).rejects.toBeInstanceOf(BadRequestException);
  });
});
