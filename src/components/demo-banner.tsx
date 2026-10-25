import { isPlaceholder } from '@/lib/placeholder';

/**
 * A strip across the top while the site is filled with demo content.
 *
 * It is driven by the content itself: the demo seed prefixes everything with
 * ЖИШЭЭ / SAMPLE, so if the mission line carries that prefix, the site is in
 * a walkthrough state and says so. Real content makes the strip disappear
 * with no setting to remember.
 */
export function isDemoContent(missionLine?: string | null): boolean {
  const text = missionLine?.trim() ?? '';
  return text.startsWith('ЖИШЭЭ:') || text.startsWith('SAMPLE:') || isPlaceholder(text);
}

export function DemoBanner({ missionLine }: { missionLine?: string | null }) {
  if (!isDemoContent(missionLine)) return null;

  return (
    <div className="border-accent-mark bg-accent-surface text-ink border-b px-4 py-2 text-center text-sm">
      <span aria-hidden="true" className="text-accent me-2">
        ●
      </span>
      <strong>Жишээ агуулга</strong> — энд байгаа тоо, нэр, судалгаа бүгд туршилтынх.
      <span className="text-ink-muted ms-2">
        Sample content: every figure and name on this site is a placeholder.
      </span>
    </div>
  );
}
