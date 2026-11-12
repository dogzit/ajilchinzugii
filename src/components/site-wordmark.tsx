import Image from 'next/image';
import type { Media } from '@/payload-types';
import { mediaSrc } from '@/lib/media';

/**
 * The organisation's mark followed by its name.
 *
 * The uploaded logo stands where the honey dot stands without one: it
 * replaces the dot, not the name. The mark is a glyph rather than a
 * wordmark, and a small abstract shape on its own tells a first-time reader
 * nothing — the name has to stay set in type beside it.
 *
 * Because the name is right there, the image is decorative and carries an
 * empty alt. Giving it the alt text as well would have the link to the front
 * page read "Ajilchin Zugii logo Ajilchin Zugii" to a screen reader.
 *
 * Height is fixed and the width follows, so swapping the file for a wider
 * one never shifts the header.
 */
export function SiteWordmark({
  logo,
  name,
  size = 'header',
}: {
  logo?: Media | number | null;
  name: string;
  size?: 'header' | 'footer';
}) {
  const image = typeof logo === 'object' ? logo : null;
  const src = mediaSrc(image?.url);
  const height = size === 'header' ? 28 : 32;

  return (
    <>
      {src ? (
        <Image
          src={src}
          alt=""
          height={height}
          width={Math.round(height * ((image?.width ?? 4) / (image?.height ?? 1)))}
          sizes={`${height * 6}px`}
          priority={size === 'header'}
          className={
            size === 'header' ? 'h-7 w-auto rounded-md' : 'h-8 w-auto rounded-md'
          }
        />
      ) : (
        <span aria-hidden="true" className="text-accent-mark">
          ●
        </span>
      )}
      {name}
    </>
  );
}
