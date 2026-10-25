import Image from 'next/image';
import type { Partner } from '@/payload-types';
import type { Locale } from '@/i18n/routing';
import { mediaSrc } from '@/lib/media';

/**
 * The partner strip.
 *
 * Two identical tracks sit side by side and the pair slides left by exactly
 * half its width, so the second copy arrives where the first started and the
 * loop has no seam. It pauses on hover and on focus inside it, and a reader
 * who asks for reduced motion gets the same logos as a static, wrapped row
 * instead — the duplicate is hidden so nothing appears twice.
 *
 * Logos are grey until pointed at: a wall of competing brand colours would
 * pull attention off the work above.
 */

/** Enough copies that a short list still fills a wide screen. */
const MIN_ITEMS = 8;

function Logo({ partner, locale }: { partner: Partner; locale: Locale }) {
  const logo = typeof partner.logo === 'object' ? partner.logo : null;
  const src = mediaSrc(logo?.url);
  const alt = logo?.alt?.[locale] ?? partner.name;

  return src ? (
    <Image
      src={src}
      alt={alt}
      width={160}
      height={56}
      sizes="160px"
      className="h-10 w-auto object-contain grayscale transition duration-200 group-hover:grayscale-0 sm:h-12"
    />
  ) : (
    <span className="text-ink-muted group-hover:text-ink text-sm whitespace-nowrap">
      {partner.name}
    </span>
  );
}

function Track({
  partners,
  locale,
  newTabLabel,
  clone = false,
}: {
  partners: Partner[];
  locale: Locale;
  newTabLabel: string;
  clone?: boolean;
}) {
  return (
    <ul
      className={`marquee-track flex shrink-0 items-center gap-10 pe-10 sm:gap-16 sm:pe-16 ${
        clone ? 'marquee-clone' : ''
      }`}
      aria-hidden={clone || undefined}
    >
      {partners.map((partner, index) => (
        <li key={`${partner.id}-${index}`} className="group shrink-0">
          {partner.url ? (
            <a
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-sm"
              tabIndex={clone ? -1 : undefined}
            >
              <Logo partner={partner} locale={locale} />
              <span className="sr-only">
                {partner.name} {newTabLabel}
              </span>
            </a>
          ) : (
            <Logo partner={partner} locale={locale} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function PartnersMarquee({
  partners,
  locale,
  heading,
  lead,
  newTabLabel,
}: {
  partners: Partner[];
  locale: Locale;
  heading: string;
  lead: string;
  newTabLabel: string;
}) {
  if (partners.length === 0) return null;

  const filled: Partner[] = [];
  while (filled.length < MIN_ITEMS) filled.push(...partners);

  return (
    <section aria-labelledby="partners" className="border-border border-b">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <h2 id="partners" className="font-display text-ink text-2xl sm:text-3xl">
          {heading}
        </h2>
        <p className="text-ink-muted mt-3 max-w-[60ch]">{lead}</p>
      </div>

      <div className="marquee mt-10 flex overflow-hidden pb-14 sm:pb-20">
        <Track partners={filled} locale={locale} newTabLabel={newTabLabel} />
        <Track partners={filled} locale={locale} newTabLabel={newTabLabel} clone />
      </div>
    </section>
  );
}
