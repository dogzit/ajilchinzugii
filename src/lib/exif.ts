/**
 * Removes every metadata block from an uploaded image.
 *
 * Until now this happened by accident: `sharp` re-encoded each upload and
 * `withMetadata: false` meant the re-encoded file carried nothing. On
 * Cloudflare Workers there is no `sharp` — it is a native binary and workerd
 * cannot load it — so an uploaded photograph would reach the bucket with its
 * EXIF intact, GPS coordinates and all. R2 serves that file publicly, which
 * is exactly what CLAUDE.md rule 4 forbids.
 *
 * So the stripping is done here instead, in plain TypeScript that runs the
 * same in Node and in workerd, and it runs on both platforms rather than only
 * the one that needs it: the original that reaches storage is clean before
 * anything else looks at it.
 *
 * This rewrites containers; it never re-encodes pixels. The image that comes
 * out is the image that went in, minus the parts that describe who took it,
 * where, and with what.
 *
 * A format it cannot prove clean is refused rather than passed through. An
 * upload that fails is a nuisance; an upload that silently keeps a child's
 * home coordinates is the thing this codebase exists to prevent.
 */

/** Formats whose metadata this module knows how to remove completely. */
export const strippableImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class UnstrippableImageError extends Error {
  constructor(mimeType: string) {
    super(
      `Энэ төрлийн зургийн нэмэлт мэдээллийг баталгаатай арилгаж чадахгүй тул хүлээж авахгүй: ${mimeType}. ` +
        'JPEG, PNG, WebP хэлбэрээр оруулна уу. ' +
        `Metadata cannot be verifiably removed from ${mimeType}, so it is not accepted. ` +
        'Please upload JPEG, PNG or WebP instead.',
    );
    this.name = 'UnstrippableImageError';
  }
}

const bytes = (data: Buffer | Uint8Array): Uint8Array =>
  data instanceof Uint8Array ? data : new Uint8Array(data);

/**
 * JPEG: a chain of `FF <marker> <2-byte length> <payload>` segments, ending
 * at the start-of-scan after which the compressed pixels run to the end.
 *
 * EXIF lives in APP1, XMP in APP1 too, IPTC and Photoshop blocks in APP13,
 * and a camera will write several more. Every APP segment above APP0 is
 * dropped, along with any comment. APP0 is the JFIF header and says nothing
 * about the photographer, so it stays.
 */
function stripJpeg(input: Uint8Array): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  let i = 2;

  while (i + 1 < input.length) {
    if (input[i] !== 0xff) break;

    const marker = input[i + 1]!;

    // Standalone markers carry no length. Reaching one here means the file is
    // not shaped as expected, so stop editing and copy the remainder as-is.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }

    // Start of scan: the entropy-coded data follows and must not be touched.
    if (marker === 0xda) break;

    const length = (input[i + 2]! << 8) | input[i + 3]!;
    if (length < 2 || i + 2 + length > input.length) break;

    const isAppAboveZero = marker >= 0xe1 && marker <= 0xef;
    const isComment = marker === 0xfe;

    if (!isAppAboveZero && !isComment) {
      for (let b = i; b < i + 2 + length; b += 1) out.push(input[b]!);
    }

    i += 2 + length;
  }

  for (let b = i; b < input.length; b += 1) out.push(input[b]!);
  return Uint8Array.from(out);
}

/**
 * PNG: an 8-byte signature then `<4-byte length> <4-byte type> <data> <CRC>`
 * chunks. Whole chunks are dropped, so no checksum needs recomputing.
 *
 * The text chunks are where a camera or an editor writes a description, and
 * `eXIf` is the same payload a JPEG keeps in APP1. `tIME` is the last
 * modification time — not personal, but it is one more thing about the file
 * nobody asked to publish. Colour chunks such as `iCCP` and `gAMA` are kept:
 * dropping them would change how the image looks.
 */
const pngChunksToDrop = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

function stripPng(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let b = 0; b < 8; b += 1) out.push(input[b]!);

  let i = 8;
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);

  while (i + 8 <= input.length) {
    const length = view.getUint32(i);
    const type = String.fromCharCode(
      input[i + 4]!,
      input[i + 5]!,
      input[i + 6]!,
      input[i + 7]!,
    );
    const total = 12 + length;
    if (i + total > input.length) break;

    if (!pngChunksToDrop.has(type)) {
      for (let b = i; b < i + total; b += 1) out.push(input[b]!);
    }

    i += total;
    if (type === 'IEND') break;
  }

  return Uint8Array.from(out);
}

/**
 * WebP: a RIFF container of `<4-char tag> <4-byte little-endian size>
 * <payload>` chunks, each padded to an even length.
 *
 * `EXIF` and `XMP ` are dropped. When the file has a `VP8X` header, its flag
 * byte advertises what the container holds, so the two corresponding bits are
 * cleared — leaving them set would describe chunks that are no longer there.
 * The RIFF size at the front is rewritten to match what is left.
 */
function stripWebp(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let b = 0; b < 12; b += 1) out.push(input[b]!);

  let i = 12;
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);

  while (i + 8 <= input.length) {
    const tag = String.fromCharCode(input[i]!, input[i + 1]!, input[i + 2]!, input[i + 3]!);
    const size = view.getUint32(i + 4, true);
    const padded = size + (size % 2);
    const total = 8 + padded;
    if (i + total > input.length) break;

    if (tag !== 'EXIF' && tag !== 'XMP ') {
      const start = out.length;
      for (let b = i; b < i + total; b += 1) out.push(input[b]!);

      // VP8X flags: bit 3 says an EXIF chunk follows, bit 2 says XMP does.
      if (tag === 'VP8X') out[start + 8] = out[start + 8]! & ~0b0000_1100;
    }

    i += total;
  }

  const result = Uint8Array.from(out);
  // RIFF size counts everything after the first eight bytes.
  new DataView(result.buffer).setUint32(4, result.length - 8, true);
  return result;
}

/**
 * The cleaned bytes, or a thrown `UnstrippableImageError` for a format whose
 * metadata this cannot remove.
 */
export function stripImageMetadata(
  data: Buffer | Uint8Array,
  mimeType: string,
): Uint8Array {
  const input = bytes(data);

  switch (mimeType) {
    case 'image/jpeg':
      return stripJpeg(input);
    case 'image/png':
      return stripPng(input);
    case 'image/webp':
      return stripWebp(input);
    default:
      throw new UnstrippableImageError(mimeType);
  }
}
