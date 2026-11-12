/**
 * Copies every row from Neon (Postgres) into D1 (SQLite).
 *
 *   pnpm copy:d1          # write the SQL and check it, change nothing
 *   pnpm copy:d1 --apply  # also load it into D1 and verify the counts
 *
 * Re-runnable: it clears each table before loading it, so a second run
 * replaces rather than doubles. That matters because the real migration is
 * rehearsed several times before the one that counts.
 *
 * Postgres and SQLite disagree about types, and silence is the danger here —
 * SQLite will accept almost anything. So every value is converted
 * deliberately rather than stringified and hoped over:
 *
 *   jsonb      → TEXT holding JSON. Every biography, abstract and policy
 *                paragraph on this site is Lexical rich text in a jsonb
 *                column; this is the conversion most worth distrusting, so
 *                the verification re-parses it rather than eyeballing it.
 *   boolean    → 0 / 1, which is what SQLite means by a boolean.
 *   timestamp  → ISO 8601 text, matching what the D1 schema defaults to.
 *   numeric    → number, because SQLite has no arbitrary-precision decimal.
 *   null       → NULL, never the string "null".
 *
 * Insert order follows the foreign keys: a child row cannot land before the
 * parent it points at. The order is derived from the live schema rather than
 * written down here, so a new collection does not quietly break it.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { getPayload } from 'payload';
import config from '../src/payload.config';

const OUT = path.resolve(process.cwd(), '.d1-copy.sql');
const DATABASE = 'ajilchinzugii';
const apply = process.argv.includes('--apply');

type Row = Record<string, unknown>;

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** One Postgres value as a SQLite literal. */
function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Date) return quote(value.toISOString());
  // jsonb arrives already parsed; it has to go back to text for SQLite.
  if (typeof value === 'object') return quote(JSON.stringify(value));
  return quote(String(value));
}

async function main() {
  // Reads Postgres, always. The adapter is switchable now, and running this
  // against D1 would mean copying D1 onto itself.
  if (process.env.DB_DRIVER?.trim() === 'd1') {
    console.error('DB_DRIVER=d1 — this script reads Neon. Unset it and try again.');
    process.exit(1);
  }

  const payload = await getPayload({ config });
  // `payload.db` is a union now that the adapter is switchable, and only the
  // Postgres side has `execute`. The guard above is what makes this safe.
  const drizzle = payload.db.drizzle as unknown as {
    execute: (query: string) => Promise<{ rows: Row[] }>;
  };
  const sql = (text: string) => drizzle.execute(text);

  const { rows: tableRows } = await sql(`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'`);
  const tables: string[] = tableRows.map((r: Row) => String(r.table_name));

  const { rows: fkRows } = await sql(`
    select tc.table_name as child, ccu.table_name as parent
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`);

  // Parents before children. Self-references are ignored: a table cannot
  // wait for itself, and SQLite is happy as long as the parent row is in the
  // same statement batch.
  const parentsOf = new Map<string, Set<string>>(tables.map((t) => [t, new Set()]));
  for (const r of fkRows as Row[]) {
    const child = String(r.child);
    const parent = String(r.parent);
    if (child !== parent) parentsOf.get(child)?.add(parent);
  }

  const ordered: string[] = [];
  const placed = new Set<string>();
  while (ordered.length < tables.length) {
    const next = tables.filter(
      (t: string) =>
        !placed.has(t) && [...(parentsOf.get(t) ?? [])].every((p) => placed.has(p)),
    );
    // A cycle would leave nothing placeable; take the rest as they come
    // rather than loop for ever, and say so.
    if (next.length === 0) {
      const rest: string[] = tables.filter((t: string) => !placed.has(t));
      console.warn(`  ! circular foreign keys, appending as-is: ${rest.join(', ')}`);
      for (const t of rest) {
        ordered.push(t);
        placed.add(t);
      }
      break;
    }
    for (const t of next) {
      ordered.push(t);
      placed.add(t);
    }
  }

  // Compare the two schemas before writing a single row.
  //
  // Without this the copy produces SQL that loads happily until it reaches
  // the one table whose columns moved, then fails halfway with a partial
  // database. Column *order* does not matter — every INSERT names its
  // columns — but a column that exists on one side and not the other does.
  const d1Columns = (table: string): string[] => {
    try {
      const out = execFileSync(
        'pnpm',
        [
          'exec',
          'wrangler',
          'd1',
          'execute',
          DATABASE,
          '--remote',
          '--json',
          '--command',
          `SELECT name FROM pragma_table_info('${table}')`,
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
      const parsed = JSON.parse(out.slice(out.indexOf('[')));
      const results = Array.isArray(parsed) ? parsed[0].results : parsed.result[0].results;
      return (results as Row[]).map((r) => String(r.name));
    } catch {
      return [];
    }
  };

  console.log('Comparing the two schemas...');
  const problems: string[] = [];
  for (const table of ordered) {
    const { rows } = await sql(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = '${table}'`,
    );
    const source = new Set((rows as Row[]).map((r) => String(r.column_name)));
    const target = new Set(d1Columns(table));

    if (target.size === 0) {
      problems.push(`${table}: missing from D1 entirely`);
      continue;
    }
    const onlySource = [...source].filter((c) => !target.has(c));
    const onlyTarget = [...target].filter((c) => !source.has(c));
    if (onlySource.length) problems.push(`${table}: in Neon only — ${onlySource.join(', ')}`);
    if (onlyTarget.length) problems.push(`${table}: in D1 only — ${onlyTarget.join(', ')}`);
  }

  if (problems.length > 0) {
    console.error('\nThe schemas do not match, so the copy would load part-way and stop:\n');
    for (const line of problems) console.error(`  ${line}`);
    console.error(
      '\nUsually this means one side is missing a migration.' +
        '\n  Neon:  pnpm migrate' +
        '\n  D1:    pnpm migrate:d1',
    );
    process.exit(1);
  }
  console.log('  schemas agree\n');

  const statements: string[] = [];
  const counts = new Map<string, number>();
  let total = 0;

  for (const table of ordered) {
    const { rows } = await sql(`select * from "${table}"`);
    counts.set(table, rows.length);
    total += rows.length;
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0] as Row);
    const columnList = columns.map((c) => `\`${c}\``).join(', ');

    // Chunked: one enormous INSERT is both slower and harder to read when a
    // single row is malformed.
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = (rows as Row[]).slice(i, i + 50);
      const values = chunk
        .map((row) => `(${columns.map((c) => literal(row[c])).join(', ')})`)
        .join(',\n  ');
      statements.push(`INSERT INTO \`${table}\` (${columnList}) VALUES\n  ${values};`);
    }
  }

  // Children first when clearing, the reverse of the insert order.
  const deletes = [...ordered].reverse().map((t) => `DELETE FROM \`${t}\`;`);

  writeFileSync(OUT, [...deletes, '', ...statements].join('\n') + '\n', 'utf8');

  const nonEmpty = [...counts.entries()].filter(([, n]) => n > 0);
  console.log(`tables: ${tables.length}, with rows: ${nonEmpty.length}`);
  console.log(`rows:   ${total}`);
  console.log(`sql:    ${OUT} (${statements.length} insert statements)`);

  if (!apply) {
    console.log('\nNothing was written to D1. Re-run with --apply to load it.');
    process.exit(0);
  }

  console.log('\nLoading into D1...');
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', DATABASE, '--remote', '--yes', '--file', OUT],
    { stdio: 'inherit' },
  );

  console.log('\nVerifying row counts...');
  let mismatches = 0;
  for (const [table, expected] of nonEmpty) {
    const out = execFileSync(
      'pnpm',
      [
        'exec',
        'wrangler',
        'd1',
        'execute',
        DATABASE,
        '--remote',
        '--json',
        '--command',
        `SELECT COUNT(*) AS n FROM \`${table}\``,
      ],
      { encoding: 'utf8' },
    );
    const parsed = JSON.parse(out.slice(out.indexOf('[')));
    const actual = Number(
      (Array.isArray(parsed) ? parsed[0].results : parsed.result[0].results)[0].n,
    );
    if (actual !== expected) {
      console.error(`  MISMATCH ${table}: Postgres ${expected}, D1 ${actual}`);
      mismatches += 1;
    }
  }

  if (mismatches > 0) {
    console.error(`\n${mismatches} table(s) do not match. The copy is not usable.`);
    process.exit(1);
  }
  console.log(`\nEvery table matches. ${total} rows copied.`);
  process.exit(0);
}

if (!existsSync('package.json')) {
  console.error('Run this from the project root.');
  process.exit(1);
}

await main();
