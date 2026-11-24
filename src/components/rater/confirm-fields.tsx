'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EvidenceQuote } from '@/components/ui/evidence-quote';
import { emptyFields } from '@/lib/rater/blank';
import type { ContractFields, Extraction } from '@/lib/rater/fields';
import { fill } from '@/lib/rater/present';
import { Choice, TextField, toNumber, YesNo, type YesNoValue } from './inputs';
import type { RatingRequestBody } from './rating-view';
import type { CategoryOption, RaterMessages } from './types';

type Kind = 'date' | 'time' | 'number' | 'yesno' | 'docType' | 'termKind' | 'payUnit';
type FieldSpec = { path: string; kind: Kind; group: 'worker' | 'hours' | 'pay' | 'other' };

/** What the confirmation screen shows, in the order a reader would check it. */
const FIELDS: FieldSpec[] = [
  { path: 'worker.date_of_birth', kind: 'date', group: 'worker' },
  { path: 'doc_type', kind: 'docType', group: 'worker' },
  { path: 'term.kind', kind: 'termKind', group: 'worker' },
  { path: 'term.start', kind: 'date', group: 'worker' },
  { path: 'term.end', kind: 'date', group: 'worker' },
  { path: 'signed.employee', kind: 'yesno', group: 'worker' },
  { path: 'signed.employer', kind: 'yesno', group: 'worker' },
  { path: 'signed.guardian', kind: 'yesno', group: 'worker' },
  { path: 'signed.copy_given', kind: 'yesno', group: 'worker' },
  { path: 'worker.id_copy_attached', kind: 'yesno', group: 'worker' },
  { path: 'schedule.days_per_week', kind: 'number', group: 'hours' },
  { path: 'schedule.hours_per_day', kind: 'number', group: 'hours' },
  { path: 'schedule.hours_per_week', kind: 'number', group: 'hours' },
  { path: 'schedule.start_time', kind: 'time', group: 'hours' },
  { path: 'schedule.end_time', kind: 'time', group: 'hours' },
  { path: 'schedule.lunch_break_min', kind: 'number', group: 'hours' },
  { path: 'schedule.rest_days_per_week', kind: 'number', group: 'hours' },
  { path: 'schedule.overtime_allowed', kind: 'yesno', group: 'hours' },
  { path: 'schedule.roster_work', kind: 'yesno', group: 'hours' },
  { path: 'schedule.business_trips', kind: 'yesno', group: 'hours' },
  { path: 'pay.amount', kind: 'number', group: 'pay' },
  { path: 'pay.unit', kind: 'payUnit', group: 'pay' },
  { path: 'pay.payments_per_month', kind: 'number', group: 'pay' },
  { path: 'pay.fixed_pay_dates', kind: 'yesno', group: 'pay' },
  { path: 'pay.overtime_rate', kind: 'number', group: 'pay' },
  { path: 'pay.night_rate', kind: 'number', group: 'pay' },
  { path: 'probation.months', kind: 'number', group: 'pay' },
  { path: 'leave.annual_days', kind: 'number', group: 'other' },
  { path: 'medical_checks', kind: 'yesno', group: 'other' },
  { path: 'via_labour_agency', kind: 'yesno', group: 'other' },
];

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | null)?.[key], obj);

function setIn<T>(obj: T, path: string, value: unknown): T {
  const copy = structuredClone(obj);
  const keys = path.split('.');
  const last = keys.pop()!;
  const parent = keys.reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, copy as Record<string, unknown>);
  parent[last] = value;
  return copy;
}

const toYesNo = (v: unknown): YesNoValue | null => (v === true ? 'yes' : v === false ? 'no' : null);
const fromYesNo = (v: YesNoValue) => (v === 'yes' ? true : v === 'no' ? false : null);

/**
 * The confirmation screen (spec, "User flow"): every value beside the words
 * it was read from, editable. A value the reader changes loses its excerpt —
 * it is now the reader's, not the document's. Then the reality check: what
 * actually happens at work, rated alongside the contract.
 */
export function ConfirmFields({
  t,
  extracted,
  dropped,
  categories,
  busy,
  onConfirm,
  onBack,
}: {
  t: RaterMessages;
  extracted: Extraction;
  dropped: string[];
  categories: CategoryOption[];
  busy: boolean;
  onConfirm: (body: RatingRequestBody) => void;
  onBack: () => void;
}) {
  const d = t.document;
  const [fields, setFields] = useState<Extraction>(extracted);
  const [corrected, setCorrected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string | null>(null);
  const [hoursPerUnit, setHoursPerUnit] = useState<number | null>(null);
  const [same, setSame] = useState<YesNoValue | null>(null);
  const [actual, setActual] = useState<{ days: number | null; start: string; end: string; extra: number | null }>({ days: null, start: '', end: '', extra: null });
  const [canQuit, setCanQuit] = useState<YesNoValue | null>(null);
  const [injured, setInjured] = useState<YesNoValue | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const change = (path: string, value: unknown) => {
    setFields((f) => {
      const next = setIn(f, path, value);
      delete next.evidence[path];
      return next;
    });
    setCorrected((c) => new Set(c).add(path));
  };

  const label = (path: string) => (d.fields as Record<string, string>)[path.replace(/\./g, '__')] ?? path;

  const input = (spec: FieldSpec) => {
    const value = get(fields, spec.path);
    const name = label(spec.path);
    switch (spec.kind) {
      case 'date':
      case 'time':
        return <TextField type={spec.kind} label={name} value={(value as string | null) ?? ''} onChange={(v) => change(spec.path, v || null)} />;
      case 'number':
        return (
          <TextField
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            label={name}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(v) => change(spec.path, toNumber(v))}
          />
        );
      case 'yesno':
        return <YesNo legend={name} labels={t.answer} value={toYesNo(value)} onChange={(v) => change(spec.path, fromYesNo(v))} />;
      case 'docType':
      case 'termKind':
      case 'payUnit': {
        const options =
          spec.kind === 'docType'
            ? [
                { value: 'employment', label: t.q4.typeEmployment },
                { value: 'service', label: t.q4.typeService },
                { value: 'internship', label: t.q4.typeInternship },
                { value: 'apprenticeship', label: t.q4.typeApprenticeship },
                { value: 'other', label: d.docTypeOther },
              ]
            : spec.kind === 'termKind'
              ? Object.entries(d.termKinds).map(([v, l]) => ({ value: v, label: l }))
              : [
                  { value: 'hour', label: t.q9.unitHour },
                  { value: 'day', label: t.q9.unitDay },
                  { value: 'month', label: t.q9.unitMonth },
                  { value: 'delivery', label: t.q9.unitDelivery },
                  { value: 'piece', label: t.q9.unitPiece },
                  { value: 'season', label: t.q9.unitSeason },
                  { value: 'in_kind', label: t.q9.unitInKind },
                ];
        return (
          <Choice
            legend={name}
            columns
            value={(value as string | null) ?? '__unset'}
            onChange={(v) => change(spec.path, v === '__unset' ? null : v)}
            options={[...options, { value: '__unset', label: d.unset }]}
          />
        );
      }
    }
  };

  const submit = () => {
    const base = emptyFields('document');
    const written: ContractFields = {
      ...base,
      ...fields,
      source: 'document',
      job_category: category,
      written_contract: true,
      hours_per_unit: hoursPerUnit,
      can_quit: fromYesNo(canQuit ?? 'unknown'),
      injured: fromYesNo(injured ?? 'unknown'),
    };
    let real: ContractFields | undefined;
    const differs = same === 'no' || (actual.extra ?? 0) > 0;
    if (differs) {
      real = structuredClone(written);
      if (same === 'no') {
        if (actual.days !== null) real.schedule.days_per_week = actual.days;
        if (actual.start) real.schedule.start_time = actual.start;
        if (actual.end) real.schedule.end_time = actual.end;
        if (actual.start || actual.end || actual.days !== null) {
          // The stated totals describe the paper, not the job.
          real.schedule.hours_per_day = null;
          real.schedule.hours_per_week = null;
        }
      }
      real.extra_hours_per_week = actual.extra;
    }
    onConfirm({ fields: written, actual: real, corrected: [...corrected] });
  };

  const groups = (['worker', 'hours', 'pay', 'other'] as const).map((group) => ({ group, specs: FIELDS.filter((f) => f.group === group) }));

  return (
    <form
      className="mx-auto max-w-[46rem]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <button type="button" onClick={onBack} className="text-accent-text hover:text-ink inline-flex min-h-11 items-center font-medium">
        {t.nav.back}
      </button>
      <h2 ref={heading} tabIndex={-1} className="text-ink mt-4 outline-none">
        {d.confirmTitle}
      </h2>
      <p className="text-ink-muted mt-3">{d.confirmLead}</p>
      {dropped.length ? (
        <p role="note" className="border-score-amber bg-surface text-ink mt-4 rounded-2xl border-s-4 px-4 py-3 text-sm">
          {fill(d.dropped, { count: dropped.length })}
        </p>
      ) : null}

      <div className="border-border bg-surface mt-8 rounded-3xl border p-6">
        <Choice legend={d.category} value={category} onChange={setCategory} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <p className="text-ink-muted mt-2 text-sm">{d.categoryHelp}</p>
      </div>

      {groups.map(({ group, specs }) => (
        <section key={group} aria-labelledby={`group-${group}`} className="mt-8">
          <h3 id={`group-${group}`} className="text-ink">
            {d.groups[group]}
          </h3>
          <ul className="mt-4 grid gap-4">
            {specs.map((spec) => {
              const evidence = fields.evidence[spec.path];
              const value = get(fields, spec.path);
              return (
                <li key={spec.path} data-field={spec.path} className="border-border bg-surface rounded-3xl border p-5">
                  {input(spec)}
                  {evidence ? (
                    <EvidenceQuote excerpt={evidence.excerpt} source={d.fromContract} className="mt-3" />
                  ) : corrected.has(spec.path) ? (
                    <p className="text-ink-muted mt-2 text-xs">{d.yourAnswer}</p>
                  ) : value === null ? (
                    <p className="text-ink-muted mt-2 text-xs">{d.notFound}</p>
                  ) : null}
                </li>
              );
            })}
            {group === 'pay' && (fields.pay.unit === 'delivery' || fields.pay.unit === 'piece') ? (
              <li className="border-border bg-surface rounded-3xl border p-5">
                <TextField type="number" inputMode="decimal" min={0} step="any" label={t.q9.hoursPerUnit} value={hoursPerUnit === null ? '' : String(hoursPerUnit)} onChange={(v) => setHoursPerUnit(toNumber(v))} />
              </li>
            ) : null}
          </ul>
        </section>
      ))}

      <section aria-labelledby="reality" className="border-border bg-surface-tint mt-10 rounded-3xl border p-6">
        <h3 id="reality" className="text-ink">
          {d.realityTitle}
        </h3>
        <p className="text-ink-muted mt-2">{d.realityLead}</p>
        <div className="mt-6 grid gap-8">
          <YesNo legend={d.sameHours} labels={t.answer} value={same} onChange={setSame} />
          {same === 'no' ? (
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField type="number" inputMode="numeric" min={0} max={7} step={1} label={d.actualDays} value={actual.days === null ? '' : String(actual.days)} onChange={(v) => setActual((a) => ({ ...a, days: toNumber(v) }))} />
              <TextField type="time" label={d.actualStart} value={actual.start} onChange={(v) => setActual((a) => ({ ...a, start: v }))} />
              <TextField type="time" label={d.actualEnd} value={actual.end} onChange={(v) => setActual((a) => ({ ...a, end: v }))} />
            </div>
          ) : null}
          <TextField type="number" inputMode="decimal" min={0} step={0.5} label={d.actualExtra} value={actual.extra === null ? '' : String(actual.extra)} onChange={(v) => setActual((a) => ({ ...a, extra: toNumber(v) }))} />
          <YesNo legend={t.q14.title} labels={t.answer} value={canQuit} onChange={setCanQuit} />
          <YesNo legend={t.q15.title} labels={t.answer} value={injured} onChange={setInjured} />
        </div>
      </section>

      <Button type="submit" size="lg" className="mt-10 w-full" disabled={busy}>
        {busy ? t.nav.checking : d.check}
      </Button>
    </form>
  );
}
