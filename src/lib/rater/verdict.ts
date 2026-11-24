/** A rule's result, and the overall verdict: the worst of them. */
export type Verdict = 'red' | 'yellow' | 'green';

/** Worse is higher. */
export const verdictRank: Record<Verdict, number> = { green: 0, yellow: 1, red: 2 };

export const worstVerdict = (verdicts: Verdict[]): Verdict =>
  verdicts.reduce<Verdict>((worst, v) => (verdictRank[v] > verdictRank[worst] ? v : worst), 'green');
