// @vitest-environment node
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  stripImageMetadata,
  strippableImageTypes,
  UnstrippableImageError,
} from '../../src/lib/exif';

/**
 * These fixtures are built with `sharp` rather than written by hand, so the
 * metadata being removed is metadata a real camera or editor would write,
 * in the place it would really sit. `sharp` is a dev dependency and runs in
 * Node; the code under test uses none of it.
 */

const GPS_DESCRIPTION = 'Taken at 47.9188N 106.9176E';

const base = () =>
  sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background: { r: 200, g: 160, b: 60 },
    },
  });

const withExif = () =>
  base().withExif({
    IFD0: {
      ImageDescription: GPS_DESCRIPTION,
      Artist: 'A Photographer',
      Copyright: 'Someone',
    },
  });

/** Everything sharp can still see in the file. */
const readBack = async (data: Uint8Array) => {
  const meta = await sharp(Buffer.from(data)).metadata();
  return {
    exif: meta.exif ? Buffer.from(meta.exif).toString('latin1') : '',
    xmp: meta.xmp ? Buffer.from(meta.xmp).toString('latin1') : '',
    comments: JSON.stringify(meta.comments ?? []),
    width: meta.width,
    height: meta.height,
  };
};

describe('stripping image metadata', () => {
  it('removes EXIF from a JPEG and leaves the picture intact', async () => {
    const original = await withExif().jpeg().toBuffer();
    expect((await readBack(original)).exif).toContain(GPS_DESCRIPTION);

    const cleaned = stripImageMetadata(original, 'image/jpeg');
    const after = await readBack(cleaned);

    expect(after.exif).toBe('');
    expect(after.xmp).toBe('');
    // Still a readable image of the same size — the pixels were not touched.
    expect(after.width).toBe(32);
    expect(after.height).toBe(24);
  });

  it('removes a JPEG comment as well as its EXIF', async () => {
    const original = await withExif().jpeg({ quality: 80 }).toBuffer();
    const cleaned = stripImageMetadata(original, 'image/jpeg');

    expect(Buffer.from(cleaned).toString('latin1')).not.toContain('A Photographer');
  });

  it('removes EXIF and text chunks from a PNG', async () => {
    const original = await withExif().png().toBuffer();
    const cleaned = stripImageMetadata(original, 'image/png');
    const after = await readBack(cleaned);

    expect(after.exif).toBe('');
    expect(Buffer.from(cleaned).toString('latin1')).not.toContain(GPS_DESCRIPTION);
    expect(after.width).toBe(32);
  });

  it('removes EXIF from a WebP and keeps it a valid WebP', async () => {
    const original = await withExif().webp().toBuffer();
    const cleaned = stripImageMetadata(original, 'image/webp');
    const after = await readBack(cleaned);

    expect(after.exif).toBe('');
    expect(Buffer.from(cleaned).toString('latin1')).not.toContain(GPS_DESCRIPTION);
    expect(after.width).toBe(32);
    expect(after.height).toBe(24);
  });

  it('writes a RIFF length that matches the bytes that are left', async () => {
    const original = await withExif().webp().toBuffer();
    const cleaned = stripImageMetadata(original, 'image/webp');

    const declared = new DataView(
      cleaned.buffer,
      cleaned.byteOffset,
      cleaned.byteLength,
    ).getUint32(4, true);
    // A stale length is how a file reads as truncated or trailing-garbage.
    expect(declared).toBe(cleaned.length - 8);
  });

  it('leaves an image that never had metadata byte for byte alone', async () => {
    const plain = await base().png().toBuffer();
    const cleaned = stripImageMetadata(plain, 'image/png');

    expect(Buffer.from(cleaned).equals(plain)).toBe(true);
  });

  it('refuses a format it cannot prove clean, rather than passing it through', async () => {
    const avif = await withExif().avif({ quality: 40 }).toBuffer();

    expect(() => stripImageMetadata(avif, 'image/avif')).toThrow(UnstrippableImageError);
    // The message has to tell an editor what to do instead, in both languages.
    expect(() => stripImageMetadata(avif, 'image/avif')).toThrow(/JPEG, PNG/);
    expect(() => stripImageMetadata(avif, 'image/avif')).toThrow(/оруулна уу/);
  });

  it('handles every type the Media collection accepts', () => {
    // If a type is ever added to the upload list, this is where it is noticed.
    for (const type of strippableImageTypes) {
      expect(() => stripImageMetadata(new Uint8Array([0, 1, 2, 3]), type)).not.toThrow();
    }
  });
});

describe('the Media upload hook', () => {
  /** Runs the collection's own beforeOperation hook over a fake upload. */
  const upload = async (data: Buffer, mimetype: string) => {
    const { Media } = await import('../../src/payload/collections/media');
    const hook = Media.hooks?.beforeOperation?.[0];
    if (!hook) throw new Error('Media has no beforeOperation hook');

    const file = { name: 'IMG_1143.HEIC.jpg', mimetype, data, size: data.length };
    await hook({ operation: 'create', req: { file } } as never);
    return file;
  };

  it('cleans an uploaded photograph before it reaches the bucket', async () => {
    const original = await withExif().jpeg().toBuffer();
    expect(original.toString('latin1')).toContain(GPS_DESCRIPTION);

    const file = await upload(original, 'image/jpeg');

    expect(file.data.toString('latin1')).not.toContain(GPS_DESCRIPTION);
    // The recorded size has to follow the bytes, or the stored object is
    // truncated or padded by whatever reads it.
    expect(file.size).toBe(file.data.length);
  });

  it('gives the file a name that carries nothing from the camera', async () => {
    const original = await base().jpeg().toBuffer();
    const file = await upload(original, 'image/jpeg');

    expect(file.name).not.toContain('IMG_1143');
  });

  it('does not accept a format it cannot clean', async () => {
    const avif = await withExif().avif({ quality: 40 }).toBuffer();

    await expect(upload(avif, 'image/avif')).rejects.toThrow(UnstrippableImageError);
  });
});
