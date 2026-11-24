/**
 * Where the reader is in a run of questions: "6 / 15" and a thin honey bar.
 * The text is the accessible part; the bar only draws it.
 */
export function Stepper({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  /** "Асуулт 6 / 15" — the whole sentence, localized. */
  label: string;
}) {
  const percent = Math.round((Math.min(current, total) / total) * 100);

  return (
    <div>
      <p className="num text-ink-muted text-sm font-medium">{label}</p>
      <div className="bg-surface-tint border-border mt-2 h-2 overflow-hidden rounded-full border">
        <div
          className="bg-accent-mark h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
