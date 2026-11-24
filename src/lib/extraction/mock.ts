import { readCv } from '../cv/mock';
import type { ContractWire } from './contract';
import type { ExtractionSpec, Extractor } from './extractor';

/**
 * A deterministic stand-in for the model, for tests, CI and local runs
 * (`RATER_EXTRACTOR=mock`). It reads a handful of phrasings with regular
 * expressions and cites the exact text it matched, so its output goes
 * through the same validation and evidence check as the model's. It is
 * not a product: it never runs where an API key is configured, and in
 * production without a key the document path is simply unavailable.
 */

type Hit = { value: unknown; excerpt: string };

function find(text: string, pattern: RegExp, value: (m: RegExpMatchArray) => unknown): Hit | null {
  const m = text.match(pattern);
  if (!m) return null;
  const v = value(m);
  return v === null || v === undefined ? null : { value: v, excerpt: m[0].trim() };
}

const num = (raw: string) => {
  const n = Number(raw.replace(/[\s,]/g, '').replace(/\.(?=\d{3}\b)/g, ''));
  return Number.isFinite(n) ? n : null;
};
const pad = (raw: string) => raw.padStart(2, '0');
const time = (raw: string) => {
  const [h, m] = raw.split(/[:.]/);
  return h && m ? `${pad(h)}:${m}` : null;
};

function readContract(text: string): ContractWire {
  const hits: Partial<Record<string, Hit | null>> = {
    doc_type:
      find(text, /хөдөлмөрийн гэрээ|hudulmuriin geree/i, () => 'employment') ??
      find(text, /ажил гүйцэтгэх гэрээ|хөлсөөр ажиллах гэрээ/i, () => 'service') ??
      find(text, /дадлагын гэрээ/i, () => 'internship'),
    'worker.date_of_birth': find(
      text,
      /(?:төрсөн|tursun)\D{0,15}(\d{4})\D{1,6}(\d{1,2})\D{1,8}(\d{1,2})/i,
      (m) => `${m[1]}-${pad(m[2]!)}-${pad(m[3]!)}`,
    ),
    'term.start': find(text, /(?:эхлэх|эхэлнэ|ehleh)\D{0,25}(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/i, (m) => `${m[1]}-${pad(m[2]!)}-${pad(m[3]!)}`),
    'schedule.start_time': find(text, /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/, (m) => time(m[1]!)),
    'schedule.end_time': find(text, /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/, (m) => time(m[2]!)),
    'schedule.days_per_week': find(text, /(?:долоо хоногт|7 хоногт|doloo honogt)\s*(\d)\s*(?:өдөр|хоног|udur)/i, (m) => num(m[1]!)),
    'schedule.hours_per_day': find(text, /(?:өдөрт|udurt)\s*(\d{1,2}(?:[.,]\d)?)\s*(?:цаг|tsag)/i, (m) => num(m[1]!.replace(',', '.'))),
    'schedule.hours_per_week': find(text, /(?:долоо хоногт|7 хоногт)\s*(?:нийт\s*)?(\d{1,2}(?:[.,]\d)?)\s*цаг/i, (m) => num(m[1]!.replace(',', '.'))),
    'schedule.lunch_break_min':
      find(text, /(\d{1,3})\s*минутын\s*(?:үдийн\s*)?завсарлага/i, (m) => num(m[1]!)) ??
      find(text, /1 цагийн\s*(?:үдийн\s*)?завсарлага/i, () => 60),
    'schedule.overtime_allowed':
      find(text, /илүү цагаар ажиллуулахгүй/i, () => false) ?? find(text, /илүү цагаар ажиллуулж болно|илүү цагаар ажиллана/i, () => true),
    'pay.amount': find(
      text,
      /(цагийн|цагт|өдрийн|өдөрт|сарын|сард|хүргэлт бүрт|хүргэлтэд|ширхэг бүрт|tsagiin|saryn)\D{0,25}?(\d[\d\s,.]{2,})\s*(?:төгрөг|₮|tugrug|togrog)/i,
      (m) => num(m[2]!),
    ),
    'pay.unit': find(
      text,
      /(цагийн|цагт|өдрийн|өдөрт|сарын|сард|хүргэлт бүрт|хүргэлтэд|ширхэг бүрт|tsagiin|saryn)\D{0,25}?(\d[\d\s,.]{2,})\s*(?:төгрөг|₮|tugrug|togrog)/i,
      (m) => {
        const w = m[1]!.toLowerCase();
        if (/цаг|tsag/.test(w)) return 'hour';
        if (/өдөр|өдр/.test(w)) return 'day';
        if (/сар|sar/.test(w)) return 'month';
        if (/хүргэлт/.test(w)) return 'delivery';
        if (/ширхэг/.test(w)) return 'piece';
        return null;
      },
    ),
    'pay.payments_per_month': find(text, /(?:сард|sard)\s*(\d)\s*(?:удаа|udaa)/i, (m) => num(m[1]!)),
    'pay.fixed_pay_dates': find(text, /(?:сар бүрийн|тогтсон өдөр)\s*\d{1,2}/i, () => true),
    'probation.months':
      find(text, /туршилтын хугацаагүй|туршилтын хугацаа тогтоохгүй/i, () => 0) ??
      find(text, /туршилтын хугацаа\D{0,10}(\d{1,2})\s*сар/i, (m) => num(m[1]!)),
    'leave.annual_days': find(text, /(\d{1,2})\s*(?:ажлын\s*)?өдрийн\s*(?:цалинтай\s*)?(?:ээлжийн\s*)?амралт/i, (m) => num(m[1]!)),
    'signed.guardian': find(text, /(?:эцэг эх|асран хамгаалагч)[^\n]{0,30}гарын үсэг/i, () => true),
    'signed.employer': find(text, /ажил олгогч[^\n]{0,20}гарын үсэг/i, () => true),
    'signed.employee': find(text, /ажилтан[^\n]{0,20}гарын үсэг/i, () => true),
    medical_checks: find(text, /эрүүл мэндийн үзлэг/i, () => true),
  };

  const flagged: ContractWire['flagged_clauses'] = [];
  const clause = (category: ContractWire['flagged_clauses'][number]['category'], pattern: RegExp) => {
    const m = text.match(pattern);
    if (m) flagged.push({ category, excerpt: m[0].trim(), page: 1 });
  };
  clause('fine', /[^\n.]*торгууль[^\n.]*/i);
  clause('deposit', /[^\n.]*барьцаа[^\n.]*/i);
  clause('id_retention', /[^\n.]*(?:үнэмлэхийг|бичиг баримтыг)[^\n.]*(?:хадгална|хураана|барина)[^\n.]*/i);
  clause('non_compete', /[^\n.]*өрсөлд[^\n.]*/i);
  clause('end_of_season_pay', /[^\n.]*улирлын төгсгөлд[^\n.]*/i);

  const value = (path: string) => (hits[path]?.value ?? null) as never;
  return {
    doc_type: value('doc_type'),
    language: /[а-яөү]/i.test(text) ? 'mn-cyrl' : 'mn-latn',
    signed: { employer: value('signed.employer'), employee: value('signed.employee'), guardian: value('signed.guardian'), copy_given: null },
    worker: { date_of_birth: value('worker.date_of_birth'), id_copy_attached: null },
    employer_kind: null,
    job: { title: null, duties_listed: null, location_listed: null, tasks: [] },
    term: { kind: null, start: value('term.start'), end: null, extension_months: null },
    probation: { months: value('probation.months'), extension_months: null, pay_amount: null },
    schedule: {
      hours_per_day: value('schedule.hours_per_day'),
      days_per_week: value('schedule.days_per_week'),
      hours_per_week: value('schedule.hours_per_week'),
      start_time: value('schedule.start_time'),
      end_time: value('schedule.end_time'),
      overtime_allowed: value('schedule.overtime_allowed'),
      roster_work: null,
      business_trips: null,
      lunch_break_min: value('schedule.lunch_break_min'),
      rest_days_per_week: null,
    },
    pay: { amount: value('pay.amount'), unit: value('pay.unit'), payments_per_month: value('pay.payments_per_month'), fixed_pay_dates: value('pay.fixed_pay_dates'), overtime_rate: null, night_rate: null },
    leave: { annual_days: value('leave.annual_days') },
    medical_checks: value('medical_checks'),
    via_labour_agency: null,
    flagged_clauses: flagged,
    evidence: Object.entries(hits)
      .filter((entry): entry is [string, Hit] => Boolean(entry[1]))
      .map(([field, hit]) => ({ field: field as ContractWire['evidence'][number]['field'], excerpt: hit.excerpt, page: 1, confidence: 0.5 })),
  };
}

const readers: Record<string, (text: string) => unknown> = { contract: readContract, cv: readCv };

export function registerMockReader(name: string, reader: (text: string) => unknown) {
  readers[name] = reader;
}

export const mockExtractor: Extractor = {
  async extract<T>(spec: ExtractionSpec<T>, text: string): Promise<T> {
    const reader = readers[spec.name];
    if (!reader) throw new Error(`No mock reader for ${spec.name}`);
    return spec.schema.parse(reader(text));
  },
};
