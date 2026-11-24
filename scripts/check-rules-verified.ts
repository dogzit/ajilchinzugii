/**
 * The lawyer gate.
 *
 * Every contract rule must carry `lawyer_verified: true`, and every CV rule
 * `staff_verified: true`, before the rater is offered to the public. While
 * any is false this script lists them; it fails (exit 1) when the build is a
 * production one — NEXT_PUBLIC_ALLOW_INDEXING=true, the same signal
 * check:placeholders uses — or when RULES_GATE=strict (CI on main).
 *
 * Run: pnpm check:rules
 *
 * Never set a flag to true to get past this. The flag records that a lawyer
 * (or, for CV rules, staff) checked the rule against its source.
 */
import { existsSync, readFileSync } from 'node:fs';

type Entry = { id: string; lawyer_verified?: boolean; staff_verified?: boolean };

const SETS = [
  { path: 'src/lib/rater/rules.generated.json', flag: 'lawyer_verified', who: 'lawyer' },
  { path: 'src/lib/cv/cv-rules.generated.json', flag: 'staff_verified', who: 'staff' },
] as const;

const unverified: string[] = [];
for (const { path, flag, who } of SETS) {
  if (!existsSync(path)) continue;
  const { rules } = JSON.parse(readFileSync(path, 'utf8')) as { rules: Entry[] };
  for (const rule of rules) if (rule[flag] !== true) unverified.push(`${rule.id} (${who})`);
}

const strict =
  process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim() === 'true' || process.env.RULES_GATE?.trim() === 'strict';

if (unverified.length === 0) {
  console.log('Rules gate: every rule is verified.');
  process.exit(0);
}

console.log(`\nRules gate: ${unverified.length} rule(s) not yet verified:\n  ${unverified.join('\n  ')}\n`);

if (strict) {
  console.error(
    'Хуульчаар хянагдаагүй дүрэмтэй хувилбарыг нийтэлж болохгүй.\n' +
      'A production build is not allowed while any rule is unverified.\n',
  );
  process.exit(1);
}

console.log('Not a production build, so this is a note, not a failure.\n');
