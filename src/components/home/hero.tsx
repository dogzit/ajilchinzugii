import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import type { Locale } from '@/i18n/routing';
import { localeHref } from '@/lib/locale-href';
import { formatCompact, formatDate, formatNumber } from '@/lib/format';
import type { LocalizedMetric } from '@/lib/impact';
import { mediaSrc } from '@/lib/media';
import Image from 'next/image';

/**
 * The opening: a short promise on the left, a picture on the right, and one
 * figure floating over the picture's corner.
 *
 * The floating figure is read from the same `getImpact()` call as the band
 * further down — there is one source for every number on this site, and a
 * hero that quietly hard-coded its own would be the first crack in that.
 */
export function Hero({
  locale,
  eyebrow,
  headline,
  mission,
  primaryCta,
  secondaryCta,
  trustLine,
  imageNote,
  sampleLabel,
  featured,
  featuredLabels,
  image,
}: {
  locale: Locale;
  eyebrow: string;
  headline: string;
  mission: string;
  primaryCta: string;
  secondaryCta: string;
  trustLine: string;
  imageNote: string;
  sampleLabel?: string | null;
  featured?: LocalizedMetric | null;
  featuredLabels: { suppressed: string; asOf: (date: string) => string };
  image?: { url?: string | null; alt?: string | null } | null;
}) {
  const src = mediaSrc(image?.url);

  return (
    <section aria-labelledby="hero" className="band">
      <div className="shell grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <Pill>{eyebrow}</Pill>

          <h1 id="hero" className="text-ink mt-6">
            {headline}
          </h1>

          <p className="text-ink-muted mt-6 max-w-[34rem] text-[1.1875rem] leading-relaxed">
            {mission}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={localeHref(locale, '/impact')} size="lg">
              {primaryCta}
            </ButtonLink>
            <ButtonLink
              href={localeHref(locale, '/about#contact')}
              variant="secondary"
              size="lg"
            >
              {secondaryCta}
            </ButtonLink>
          </div>

          <p className="text-ink-muted mt-7 flex items-start gap-2.5 text-sm">
            <Icon name="shield" className="text-accent-mark mt-0.5 h-4 w-4 shrink-0" />
            <span>{trustLine}</span>
          </p>
        </div>

        <div className="relative">
          <div className="border-border bg-surface-tint relative aspect-[4/3] overflow-hidden rounded-3xl border">
            {src ? (
              <Image
                src={src}
                alt={image?.alt ?? ''}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            ) : (
              <>
                <HexOutlines />
                <p className="text-ink-muted absolute inset-x-0 bottom-0 p-6 text-xs leading-relaxed">
                  {imageNote}
                </p>
              </>
            )}
          </div>

          {featured ? (
            <FloatingStat
              metric={featured}
              locale={locale}
              sampleLabel={sampleLabel}
              labels={featuredLabels}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Faint honeycomb, drawn rather than fetched. Purely a holding pattern. */
function HexOutlines() {
  const cells = [];
  const r = 26;
  const stepX = Math.sqrt(3) * r;
  const stepY = 1.5 * r;

  for (let column = 0; column < 9; column += 1) {
    for (let row = 0; row < 7; row += 1) {
      const cx = stepX * (column + 0.5) + (row % 2 ? stepX / 2 : 0);
      const cy = stepY * (row + 0.5);
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
      }).join(' ');
      cells.push(points);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${stepX * 9.5} ${stepY * 7}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="text-accent-mark absolute inset-0 h-full w-full opacity-25"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        {cells.map((points, index) => (
          <polygon key={index} points={points} />
        ))}
      </g>
    </svg>
  );
}

function FloatingStat({
  metric,
  locale,
  sampleLabel,
  labels,
}: {
  metric: LocalizedMetric;
  locale: Locale;
  sampleLabel?: string | null;
  labels: { suppressed: string; asOf: (date: string) => string };
}) {
  const asOf = formatDate(metric.asOf, locale);
  const exact = metric.value === null ? null : formatNumber(metric.value, locale);

  return (
    <article className="border-border bg-surface shadow-float absolute -bottom-8 left-4 w-[16rem] rounded-3xl border p-5 sm:left-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-ink-muted font-sans text-xs leading-snug font-medium">
          {metric.label}
        </h2>
        {sampleLabel ? (
          <span className="border-border bg-surface-tint text-ink-muted shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-medium">
            {sampleLabel}
          </span>
        ) : null}
      </div>

      {metric.suppressed ? (
        <p className="text-ink-soft mt-3 font-sans text-lg">{labels.suppressed}</p>
      ) : (
        <p
          className="num font-display text-ink mt-3 text-3xl leading-none"
          aria-label={exact ?? undefined}
        >
          {metric.value === null ? '—' : formatCompact(metric.value, locale)}
        </p>
      )}

      {asOf ? (
        <p className="num text-ink-muted mt-3 text-[0.6875rem]">{labels.asOf(asOf)}</p>
      ) : null}
    </article>
  );
}
