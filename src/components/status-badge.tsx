import { formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/routing';

/**
 * The policy's standing. Status is carried by the word, not by colour alone;
 * the accent only marks the two states that mean the work landed.
 */
export function StatusBadge({
  label,
  date,
  locale,
  tone = 'neutral',
}: {
  label: string;
  date?: string | null;
  locale: Locale;
  tone?: 'neutral' | 'accent';
}) {
  const on = formatDate(date, locale);

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={`rounded-2xl border px-2.5 py-1 text-sm ${
          tone === 'accent'
            ? 'border-accent bg-accent-surface text-ink'
            : 'border-border-strong text-ink-soft'
        }`}
      >
        {label}
      </span>
      {on ? <span className="num text-ink-muted text-sm">{on}</span> : null}
    </span>
  );
}
