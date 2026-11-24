/**
 * Extraction benchmark (spec, "Testing and acceptance": ≥ 95% on date of
 * birth, pay amount and unit, hours, and start and end times).
 *
 *   pnpm eval:extraction                 replay the recorded responses (CI)
 *   pnpm eval:extraction --mock          run the deterministic mock reader
 *   pnpm eval:extraction --live          call the model (needs GEMINI_API_KEY + GEMINI_MODEL)
 *   ... --record                         save what ran as the new recordings
 *   ... --strict                         exit 1 below the 95% target
 *
 * Every document goes through the real pipeline — file → text → redaction →
 * extractor → validation → evidence check — and only then is compared with
 * tests/fixtures/contracts/answer-key.json. A value counts as correct when it
 * equals the key's value, including null where the key says the contract is
 * silent.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPath } from '../src/lib/extraction/contract';
import type { ExtractionSpec, Extractor } from '../src/lib/extraction/extractor';
import { geminiExtractor } from '../src/lib/extraction/extractor';
import { mockExtractor } from '../src/lib/extraction/mock';
import { extractContract } from '../src/lib/extraction/service';
import { docxText, pdfText } from '../src/lib/extraction/text';
import { llmConfig } from '../src/lib/llm/gemini';

export const DIR = 'tests/fixtures/contracts';
export const TARGET = 0.95;

type Key = { fields: string[]; contracts: Record<string, Record<string, unknown>> };

export async function documentText(name: string): Promise<string> {
  const bytes = new Uint8Array(readFileSync(join(DIR, name)));
  if (name.endsWith('.pdf')) return (await pdfText(bytes)).text;
  if (name.endsWith('.docx')) return docxText(bytes).text;
  return new TextDecoder().decode(bytes);
}

/** Replays one saved response, and remembers what an extractor returned. */
function recording(name: string, inner: Extractor | null, sink: Map<string, unknown>): Extractor {
  return {
    async extract<T>(spec: ExtractionSpec<T>, text: string): Promise<T> {
      if (inner) {
        const out = await inner.extract(spec, text);
        sink.set(name, out);
        return out;
      }
      const saved = JSON.parse(readFileSync(join(DIR, 'recorded', `${name}.json`), 'utf8'));
      return spec.schema.parse(saved);
    },
  };
}

export type EvalResult = {
  overall: number;
  byField: Record<string, { correct: number; total: number }>;
  misses: { contract: string; field: string; expected: unknown; got: unknown }[];
  outputs: Map<string, unknown>;
};

export async function evaluate(inner: Extractor | null): Promise<EvalResult> {
  const key = JSON.parse(readFileSync(join(DIR, 'answer-key.json'), 'utf8')) as Key;
  const byField: EvalResult['byField'] = Object.fromEntries(key.fields.map((f) => [f, { correct: 0, total: 0 }]));
  const misses: EvalResult['misses'] = [];
  const outputs = new Map<string, unknown>();

  for (const [contract, expected] of Object.entries(key.contracts)) {
    const text = await documentText(contract);
    const { fields } = await extractContract(text, recording(contract, inner, outputs));
    for (const field of key.fields) {
      const want = expected[field] ?? null;
      const got = getPath(fields, field) ?? null;
      byField[field]!.total += 1;
      if (want === got) byField[field]!.correct += 1;
      else misses.push({ contract, field, expected: want, got });
    }
  }

  const correct = Object.values(byField).reduce((n, f) => n + f.correct, 0);
  const total = Object.values(byField).reduce((n, f) => n + f.total, 0);
  return { overall: correct / total, byField, misses, outputs };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  let inner: Extractor | null = null;
  if (args.has('--live')) {
    const config = llmConfig();
    if (!config) {
      console.log('--live needs GEMINI_API_KEY and GEMINI_MODEL. Skipped.');
      return;
    }
    inner = geminiExtractor(config);
  } else if (args.has('--mock')) {
    inner = mockExtractor;
  }

  const result = await evaluate(inner);
  const mode = args.has('--live') ? 'live model' : args.has('--mock') ? 'mock reader' : 'recorded responses';
  console.log(`\nExtraction accuracy (${mode})\n`);
  for (const [field, { correct, total }] of Object.entries(result.byField)) {
    console.log(`  ${field.padEnd(26)} ${String(correct).padStart(2)}/${total}`);
  }
  console.log(`\n  overall ${(result.overall * 100).toFixed(1)}%  (target ${TARGET * 100}%)\n`);
  for (const miss of result.misses) {
    console.log(`  miss ${miss.contract} ${miss.field}: expected ${JSON.stringify(miss.expected)}, got ${JSON.stringify(miss.got)}`);
  }

  if (args.has('--record') && inner) {
    for (const [name, output] of result.outputs) {
      writeFileSync(join(DIR, 'recorded', `${name}.json`), `${JSON.stringify(output, null, 2)}\n`);
    }
    console.log(`\nRecorded ${result.outputs.size} responses.`);
  }
  if (args.has('--strict') && result.overall < TARGET) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
