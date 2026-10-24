import { randomBytes } from 'node:crypto';

/**
 * Uploaded files are stored under a random name (CLAUDE.md rule 4): the
 * original file name may carry a minor's name, a school or a workplace, and a
 * file name ends up in a public URL.
 */

const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'pdf']);

export function randomSlug(
  bytes = 8,
  random: (size: number) => Buffer = randomBytes,
): string {
  return random(bytes).toString('hex');
}

export function fileExtension(originalName: string): string | null {
  const ext = originalName
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!ext || ext === originalName.toLowerCase()) return null;
  return allowedExtensions.has(ext) ? ext : null;
}

/**
 * Returns a random file name, keeping only the extension of the original.
 * Throws for file types we do not accept (notably SVG, which can carry script).
 */
export function anonymiseFileName(
  originalName: string,
  slug: () => string = () => randomSlug(),
): string {
  const ext = fileExtension(originalName);
  if (!ext) {
    throw new Error(
      `Зөвшөөрөгдөөгүй файлын төрөл / unsupported file type: ${originalName}. ` +
        `Зөвшөөрөгдсөн / allowed: ${[...allowedExtensions].join(', ')}.`,
    );
  }
  return `${slug()}.${ext}`;
}
