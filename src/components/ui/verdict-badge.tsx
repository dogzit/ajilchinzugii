import { Icon } from '@/components/ui/icon';
import type { Verdict } from '@/lib/rater/verdict';

const edge: Record<Verdict, string> = {
  red: 'border-score-red text-score-red',
  yellow: 'border-score-amber text-score-amber',
  green: 'border-score-green text-score-green',
};

/**
 * Red, yellow or green — never by colour alone. Each verdict has its own
 * icon shape, and the word itself is set in ink beside it (the verdict
 * colours are only 3:1 marks).
 */
export function VerdictBadge({
  verdict,
  label,
  className = '',
}: {
  verdict: Verdict;
  /** The localized verdict word, e.g. "Улаан". */
  label: string;
  className?: string;
}) {
  return (
    <span
      data-verdict={verdict}
      className={`bg-surface inline-flex items-center gap-1.5 rounded-full border-2 py-1 ps-2 pe-3 text-sm font-semibold ${edge[verdict]} ${className}`}
    >
      <Icon name={`verdict-${verdict}`} className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
      <span className="text-ink">{label}</span>
    </span>
  );
}
