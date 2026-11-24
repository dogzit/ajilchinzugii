'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Stepper } from '@/components/ui/stepper';
import { fill } from '@/lib/rater/present';
import { QUESTIONS, type Answers } from '@/lib/rater/questionnaire';
import { Choice, TextField, toNumber, YesNo } from './inputs';
import type { CategoryOption, RaterMessages } from './types';

/**
 * The spec's 15 questions, one per screen. Back keeps every answer; nothing
 * is required, because "I don't know" is an answer the engine understands.
 * Focus moves to each new question's heading, so a screen reader announces
 * it and the keyboard starts from the top.
 */
export function Questionnaire({
  t,
  categories,
  answers,
  onChange,
  step,
  onStep,
  onDone,
  onExit,
  busy,
}: {
  t: RaterMessages;
  categories: CategoryOption[];
  answers: Answers;
  onChange: (patch: Partial<Answers>) => void;
  step: number;
  onStep: (step: number) => void;
  onDone: () => void;
  onExit: () => void;
  busy: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [step]);

  const a = answers;
  const yn = t.answer;
  const total = QUESTIONS.length;
  const id = QUESTIONS[step]?.id ?? 'q1';
  const last = step === total - 1;
  const str = (n: number | null) => (n === null ? '' : String(n));

  const screens: Record<string, { title: string; help?: string; body: React.ReactNode }> = {
    q1: {
      title: t.q1.title,
      help: t.q1.help,
      body: <TextField type="date" label={t.q1.dob} value={a.dob ?? ''} onChange={(v) => onChange({ dob: v || null })} />,
    },
    q2: {
      title: t.q2.title,
      help: t.q2.help,
      body: (
        <Choice
          hideLegend
          legend={t.q2.title}
          value={a.category}
          onChange={(category) => onChange({ category })}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      ),
    },
    q3: {
      title: t.q3.title,
      body: (
        <Choice
          hideLegend
          legend={t.q3.title}
          value={a.employer}
          onChange={(employer) => onChange({ employer })}
          options={(['company', 'individual', 'organisation', 'agency', 'unknown'] as const).map((value) => ({ value, label: t.q3[value] }))}
        />
      ),
    },
    q4: {
      title: t.q4.title,
      body: (
        <div className="grid gap-8">
          <YesNo legend={t.q4.written} labels={yn} value={a.written} onChange={(written) => onChange({ written })} />
          {a.written === 'yes' ? (
            <>
              <Choice
                legend={t.q4.type}
                value={a.contractType}
                onChange={(contractType) => onChange({ contractType })}
                options={[
                  { value: 'employment', label: t.q4.typeEmployment },
                  { value: 'service', label: t.q4.typeService },
                  { value: 'internship', label: t.q4.typeInternship },
                  { value: 'apprenticeship', label: t.q4.typeApprenticeship },
                  { value: 'unknown', label: t.q4.typeUnknown },
                ]}
              />
              <YesNo legend={t.q4.signedSelf} labels={yn} value={a.signedSelf} onChange={(signedSelf) => onChange({ signedSelf })} />
              <YesNo legend={t.q4.signedEmployer} labels={yn} value={a.signedEmployer} onChange={(signedEmployer) => onChange({ signedEmployer })} />
              <YesNo legend={t.q4.signedGuardian} labels={yn} value={a.signedGuardian} onChange={(signedGuardian) => onChange({ signedGuardian })} />
              <YesNo legend={t.q4.copy} labels={yn} value={a.copy} onChange={(copy) => onChange({ copy })} />
            </>
          ) : null}
          <TextField type="date" label={t.q4.start} help={t.q4.startHelp} value={a.start ?? ''} onChange={(v) => onChange({ start: v || null })} />
        </div>
      ),
    },
    q5: {
      title: t.q5.title,
      body: (
        <TextField type="number" inputMode="numeric" min={0} max={7} step={1} label={t.q5.days} value={str(a.daysPerWeek)} onChange={(v) => onChange({ daysPerWeek: toNumber(v) })} />
      ),
    },
    q6: {
      title: t.q6.title,
      help: t.q6.help,
      body: (
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField type="time" label={t.q6.start} value={a.startTime ?? ''} onChange={(v) => onChange({ startTime: v || null })} />
          <TextField type="time" label={t.q6.end} value={a.endTime ?? ''} onChange={(v) => onChange({ endTime: v || null })} />
          <TextField type="number" inputMode="numeric" min={0} max={600} step={5} label={t.q6.break} value={str(a.breakMinutes)} onChange={(v) => onChange({ breakMinutes: toNumber(v) })} />
        </div>
      ),
    },
    q7: {
      title: t.q7.title,
      body: (
        <div className="grid gap-8">
          <YesNo legend={t.q7.extra} labels={yn} value={a.extra} onChange={(extra) => onChange({ extra })} />
          {a.extra === 'yes' ? (
            <TextField type="number" inputMode="decimal" min={0} max={100} step={0.5} label={t.q7.hours} value={str(a.extraHours)} onChange={(v) => onChange({ extraHours: toNumber(v) })} />
          ) : null}
        </div>
      ),
    },
    q8: {
      title: t.q8.title,
      body: (
        <div className="grid gap-8">
          <YesNo legend={t.q8.roster} labels={yn} value={a.roster} onChange={(roster) => onChange({ roster })} />
          <YesNo legend={t.q8.trips} labels={yn} value={a.trips} onChange={(trips) => onChange({ trips })} />
        </div>
      ),
    },
    q9: {
      title: t.q9.title,
      body: (
        <div className="grid gap-8">
          <Choice
            legend={t.q9.unit}
            value={a.payUnit}
            onChange={(payUnit) => onChange({ payUnit })}
            options={[
              { value: 'hour', label: t.q9.unitHour },
              { value: 'day', label: t.q9.unitDay },
              { value: 'month', label: t.q9.unitMonth },
              { value: 'delivery', label: t.q9.unitDelivery },
              { value: 'piece', label: t.q9.unitPiece },
              { value: 'season', label: t.q9.unitSeason },
              { value: 'in_kind', label: t.q9.unitInKind },
            ]}
          />
          {a.payUnit !== 'in_kind' ? (
            <TextField type="number" inputMode="numeric" min={0} step={100} label={t.q9.amount} value={str(a.payAmount)} onChange={(v) => onChange({ payAmount: toNumber(v) })} />
          ) : null}
          {a.payUnit === 'delivery' || a.payUnit === 'piece' ? (
            <TextField type="number" inputMode="decimal" min={0} step={0.25} label={t.q9.hoursPerUnit} value={str(a.hoursPerUnit)} onChange={(v) => onChange({ hoursPerUnit: toNumber(v) })} />
          ) : null}
        </div>
      ),
    },
    q10: {
      title: t.q10.title,
      body: (
        <div className="grid gap-8">
          <Choice
            hideLegend
            legend={t.q10.title}
            value={a.payFrequency}
            onChange={(payFrequency) => onChange({ payFrequency })}
            options={[
              { value: 'daily', label: t.q10.daily },
              { value: 'weekly', label: t.q10.weekly },
              { value: 'twice_month', label: t.q10.twiceMonth },
              { value: 'monthly', label: t.q10.monthly },
              { value: 'end_of_season', label: t.q10.endOfSeason },
              { value: 'irregular', label: t.q10.irregular },
              { value: 'unknown', label: t.q10.unknown },
            ]}
          />
          {a.payFrequency !== 'irregular' ? (
            <YesNo legend={t.q10.fixed} labels={yn} value={a.fixedDates} onChange={(fixedDates) => onChange({ fixedDates })} />
          ) : null}
        </div>
      ),
    },
    q11: {
      title: t.q11.title,
      body: (
        <div className="grid gap-8">
          <YesNo legend={t.q11.trial} labels={yn} value={a.trial} onChange={(trial) => onChange({ trial })} />
          {a.trial === 'yes' ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField type="number" inputMode="numeric" min={0} step={1} label={t.q11.length} value={str(a.trialLength)} onChange={(v) => onChange({ trialLength: toNumber(v) })} />
                <Choice
                  legend={t.q11.length}
                  columns
                  value={a.trialUnit}
                  onChange={(trialUnit) => onChange({ trialUnit })}
                  options={[
                    { value: 'days', label: t.q11.unitDays },
                    { value: 'weeks', label: t.q11.unitWeeks },
                    { value: 'months', label: t.q11.unitMonths },
                  ]}
                />
              </div>
              <Choice
                legend={t.q11.paid}
                value={a.trialPaid}
                onChange={(trialPaid) => onChange({ trialPaid })}
                options={[
                  { value: 'full', label: t.q11.paidFull },
                  { value: 'partial', label: t.q11.paidPartial },
                  { value: 'none', label: t.q11.paidNone },
                  { value: 'unknown', label: t.q11.paidUnknown },
                ]}
              />
            </>
          ) : null}
        </div>
      ),
    },
    q12: { title: t.q12.title, help: t.q12.help, body: <YesNo hideLegend legend={t.q12.title} labels={yn} value={a.deductions} onChange={(deductions) => onChange({ deductions })} /> },
    q13: { title: t.q13.title, body: <YesNo hideLegend legend={t.q13.title} labels={yn} value={a.idKept} onChange={(idKept) => onChange({ idKept })} /> },
    q14: { title: t.q14.title, help: t.q14.help, body: <YesNo hideLegend legend={t.q14.title} labels={yn} value={a.canQuit} onChange={(canQuit) => onChange({ canQuit })} /> },
    q15: { title: t.q15.title, body: <YesNo hideLegend legend={t.q15.title} labels={yn} value={a.injured} onChange={(injured) => onChange({ injured })} /> },
  };

  const screen = screens[id]!;

  return (
    <form
      className="mx-auto max-w-[40rem]"
      onSubmit={(event) => {
        event.preventDefault();
        if (last) onDone();
        else onStep(step + 1);
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => (step === 0 ? onExit() : onStep(step - 1))}
          className="text-accent-text hover:text-ink inline-flex min-h-11 items-center gap-1.5 font-medium"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          {t.nav.back}
        </button>
      </div>
      <div className="mt-4">
        <Stepper current={step + 1} total={total} label={fill(t.nav.progress, { current: step + 1, total })} />
      </div>

      <h2 ref={heading} tabIndex={-1} className="text-ink mt-8 outline-none">
        {screen.title}
      </h2>
      {screen.help ? <p className="text-ink-muted mt-3">{screen.help}</p> : null}

      <div className="mt-8">{screen.body}</div>

      <Button type="submit" size="lg" className="mt-10 w-full" disabled={busy} trailingArrow={!last}>
        {last ? (busy ? t.nav.checking : t.nav.check) : t.nav.next}
      </Button>
    </form>
  );
}
