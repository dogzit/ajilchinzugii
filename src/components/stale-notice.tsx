import { useTranslations } from 'next-intl';

/**
 * Shown when the live sheet could not be read. The figures below it are real,
 * just older — saying so is the whole point of the snapshot.
 */
export function StaleNotice() {
  const t = useTranslations('impact');

  return (
    <p
      role="status"
      className="border-accent-mark bg-accent-surface text-ink max-w-[65ch] border-s-2 px-4 py-3 text-sm"
    >
      {t('stale')}
    </p>
  );
}
