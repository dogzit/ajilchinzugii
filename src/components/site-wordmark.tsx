import Image from 'next/image';
import type { Media } from '@/payload-types';
import type { Locale } from '@/i18n/routing';
import { mediaSrc } from '@/lib/media';

/**
 * The name of the organisation, as a logo if one has been uploaded and as
 * type if it has not.
 *
 * Both forms carry the same accessible name, so the link to the front page
 * reads identically either way — a logo that leaves a link unnamed is worse
 * than no logo. Height is fixed and the width follows, so swapping the file
 * for a wider one never shifts the header.
 */
export function SiteWordmark({
  logo,
  name,
  locale,
  size = 'header',
}: {
  logo?: Media | number | null;
  name: string;
  locale: Locale;
  size?: 'header' | 'footer';
}) {
  const image = typeof logo === 'object' ? logo : null;
  const src = mediaSrc(image?.url);
  const height = size === 'header' ? 28 : 32;

  if (src) {
    return (
      <Image
        src={src}
        alt={image?.alt?.[locale]?.trim() || name}
        height={height}
        width={Math.round(height * ((image?.width ?? 4) / (image?.height ?? 1)))}
        sizes={`${height * 6}px`}
        priority={size === 'header'}
        className={size === 'header' ? 'h-7 w-auto' : 'h-8 w-auto'}
      />
    );
  }

  return (
    <>
      <span aria-hidden="true" className="text-accent-mark">
        ●
      </span>
      {name}
    </>
  );
}
