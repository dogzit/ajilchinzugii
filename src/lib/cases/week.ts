/**
 * The caseworkers' week: Monday to Sunday in Ulaanbaatar time (UTC+8, no
 * daylight saving). Capacity is counted per week key, e.g. "2026-W48".
 */
const UB_OFFSET_MS = 8 * 60 * 60 * 1000;

export function weekKey(now = new Date()): string {
  const ub = new Date(now.getTime() + UB_OFFSET_MS);
  // ISO week: the Thursday of this week decides the year.
  const day = (ub.getUTCDay() + 6) % 7;
  const thursday = new Date(Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate() - day + 3));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** The next Monday 00:00 in Ulaanbaatar, as an ISO date — when a P3 over the cap can ask again. */
export function nextWeekStart(now = new Date()): string {
  const ub = new Date(now.getTime() + UB_OFFSET_MS);
  const day = (ub.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate() - day + 7));
  return monday.toISOString().slice(0, 10);
}
