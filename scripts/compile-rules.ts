/**
 * rules.yaml → rules.generated.json (and the same for the CV rules).
 *
 * The YAML is what people edit and review; the JSON is what the app imports,
 * so neither Node nor Workers needs a YAML parser or a file read at request
 * time. tests/unit/rater-rules-sync.test.ts fails while the two disagree.
 *
 * Run: pnpm rules:compile
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';

const PAIRS = [
  ['src/lib/rater/rules.yaml', 'src/lib/rater/rules.generated.json'],
  ['src/lib/cv/cv-rules.yaml', 'src/lib/cv/cv-rules.generated.json'],
] as const;

for (const [source, target] of PAIRS) {
  if (!existsSync(source)) continue;
  const data: unknown = parse(readFileSync(source, 'utf8'));
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${source} → ${target}`);
}
