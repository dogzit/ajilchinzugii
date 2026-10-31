import { isPlaceholder } from '@/lib/placeholder';

/**
 * A strip across the top while the site is filled with demo content.
 *
 * It is driven by the content itself: the demo seed prefixes everything with
 * ЖИШЭЭ / SAMPLE, so if the mission line carries that prefix, the site is in
 * a walkthrough state and says so. Real content makes the strip disappear
 * with no setting to remember.
 *
 * One quiet line on the tint, both languages — a visitor who landed on the
 * English page should still understand why the figures are not real.
 */
export function isDemoContent(missionLine?: string | null): boolean {
  const text = missionLine?.trim() ?? '';
  return text.startsWith('ЖИШЭЭ:') || text.startsWith('SAMPLE:') || isPlaceholder(text);
}

export function DemoBanner({
  missionLine,
  line,
  secondaryLine,
}: {
  missionLine?: string | null;
  line: string;
  secondaryLine: string;
}) {
  if (!isDemoContent(missionLine)) return null;

  return (
    <div className="bg-surface-tint text-ink-muted px-6 py-2 text-center text-xs">
      <span className="text-ink font-medium">{line}</span>
      <span className="ms-2">{secondaryLine}</span>
    </div>
  );
}
