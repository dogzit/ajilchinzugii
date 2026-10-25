import Image from 'next/image';
import { HoneycombField } from '@/components/home/honeycomb-field';
import { mediaSrc } from '@/lib/media';

/**
 * The one h1 on the site's front page: the mission line, set large.
 *
 * The band beneath it is a drawn honeycomb until the organisation uploads a
 * hero image; when `image` arrives from the CMS it takes the same band, at
 * the same height, so the page does not shift shape.
 */
export function Hero({
  headline,
  image,
}: {
  headline: string;
  image?: { url?: string | null; alt?: string | null } | null;
}) {
  const src = mediaSrc(image?.url);

  return (
    <section className="border-border border-b">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-24 sm:pb-16">
        <h1 className="font-display text-ink max-w-[18ch] text-3xl leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {headline}
        </h1>
      </div>

      <div className="bg-surface-muted relative h-44 w-full overflow-hidden sm:h-72 lg:h-80">
        {src ? (
          <Image
            src={src}
            alt={image?.alt ?? ''}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <HoneycombField
            className="text-accent-mark absolute inset-0 h-full w-full opacity-60"
            // The pattern should give way to the page, not end at a hard
            // edge. A mask on the element follows its rendered width, so the
            // fade holds at every screen size.
            style={{
              maskImage: 'linear-gradient(to right, #000 0%, transparent 85%)',
            }}
          />
        )}
      </div>
    </section>
  );
}
