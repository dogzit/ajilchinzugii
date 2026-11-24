'use client';

import type mnMessages from '@messages/mn.json';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { EvidenceQuote } from '@/components/ui/evidence-quote';
import { Icon } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { VerdictBadge } from '@/components/ui/verdict-badge';
import type { CvProfile, CvRating, CvResult } from '@/lib/cv/engine';
import { fill, renderDetail } from '@/lib/rater/present';
import { DocumentInput } from './document-input';
import { Choice, YesNo } from './inputs';
import type { CategoryOption, RaterMessages, RuleText } from './types';

export type CvMessages = (typeof mnMessages)['cv'];
type Result = { rating: CvRating };

/**
 * The CV rater: profile first, then the CV through the shared pipeline, then
 * the result. The profile shapes the checks (age decides how serious
 * over-sharing is; the target job decides which skills count). Like the
 * contract rater, everything stays in memory.
 */
export function CvRater({
  t,
  raterT,
  rules,
  categories,
  prohibitedForMinors,
  aimags,
  contractHref,
  savedProfile,
  onRated,
  locale,
}: {
  locale: string;
  t: CvMessages;
  raterT: RaterMessages;
  rules: Record<string, RuleText>;
  categories: CategoryOption[];
  /** Category ids on Order A/122: not offered to under-18s. */
  prohibitedForMinors: string[];
  aimags: { id: string; name: string }[];
  contractHref: string;
  /** A signed-in member's saved profile, if any. */
  savedProfile?: CvProfile | null;
  onRated?: (profile: CvProfile, rating: CvRating) => void;
}) {
  const [step, setStep] = useState<'profile' | 'input' | 'results'>('profile');
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [profile, setProfile] = useState<CvProfile>(
    savedProfile ?? { ageBand: null, targetJob: null, experience: null, aimag: null, hasPhoto: null },
  );
  const [rating, setRating] = useState<CvRating | null>(null);
  const minor = profile.ageBand === '13_14' || profile.ageBand === '15_17';
  const jobs = minor ? categories.filter((c) => !prohibitedForMinors.includes(c.id)) : categories;

  if (step === 'input') {
    return (
      <div>
        <div className="mx-auto mb-6 flex max-w-[40rem] gap-2" role="group" aria-label={t.input.title}>
          {(['paste', 'upload'] as const).map((m) => (
            <Button key={m} variant={mode === m ? 'primary' : 'secondary'} onClick={() => setMode(m)} aria-pressed={mode === m}>
              {m === 'paste' ? t.input.paste : t.input.upload}
            </Button>
          ))}
        </div>
        <DocumentInput<Result>
          key={mode}
          t={raterT}
          mode={mode}
          endpoint="/api/cv/check"
          extra={{ profile }}
          title={t.input.title}
          pasteLabel={t.input.pasteLabel}
          readLabel={t.input.read}
          lowConfidenceText={t.input.lowConfidence}
          onBack={() => setStep('profile')}
          onExtracted={(result) => {
            setRating(result.rating);
            setStep('results');
            onRated?.(profile, result.rating);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  if (step === 'results' && rating) {
    return <CvResults t={t} raterT={raterT} rating={rating} rules={rules} contractHref={contractHref} locale={locale} onAgain={() => setStep('input')} />;
  }

  return (
    <form
      className="mx-auto max-w-[40rem]"
      onSubmit={(event) => {
        event.preventDefault();
        setStep('input');
      }}
    >
      <Pill>{t.start.eyebrow}</Pill>
      <h1 className="text-ink mt-5">{t.start.title}</h1>
      <p className="text-ink-muted mt-4 text-lg">{t.start.lead}</p>
      {savedProfile ? <p className="text-ink-muted mt-3 text-sm">{t.profile.saved}</p> : null}

      <div className="mt-10 grid gap-8">
        <Choice
          legend={t.profile.ageBand}
          columns
          value={profile.ageBand}
          onChange={(ageBand) => setProfile((p) => ({ ...p, ageBand }))}
          options={(['13_14', '15_17', '18_24'] as const).map((value) => ({ value, label: t.profile.ages[value] }))}
        />
        <div>
          <Choice legend={t.profile.targetJob} value={profile.targetJob} onChange={(targetJob) => setProfile((p) => ({ ...p, targetJob }))} options={jobs.map((c) => ({ value: c.id, label: c.name }))} />
          {minor ? <p className="text-ink-muted mt-2 text-sm">{t.profile.minorNote}</p> : null}
        </div>
        <Choice
          legend={t.profile.experience}
          value={profile.experience}
          onChange={(experience) => setProfile((p) => ({ ...p, experience }))}
          options={(['none', 'under_1', 'from_1_to_3', 'over_3'] as const).map((value) => ({ value, label: t.profile.experiences[value] }))}
        />
        <YesNo
          legend={t.profile.hasPhoto}
          labels={raterT.answer}
          value={profile.hasPhoto === null ? null : profile.hasPhoto ? 'yes' : 'no'}
          onChange={(v) => setProfile((p) => ({ ...p, hasPhoto: v === 'yes' ? true : v === 'no' ? false : null }))}
        />
        <div>
          <label htmlFor="cv-aimag" className="text-ink font-medium">
            {t.profile.aimag}
          </label>
          <select
            id="cv-aimag"
            value={profile.aimag ?? ''}
            onChange={(event) => setProfile((p) => ({ ...p, aimag: event.target.value || null }))}
            className="border-border-strong bg-surface text-ink mt-2 block min-h-12 w-full rounded-2xl border px-4"
          >
            <option value="">{t.profile.aimagNone}</option>
            {aimags.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="border-border bg-surface text-ink-soft mt-8 flex gap-3 rounded-2xl border px-4 py-3 text-sm">
        <Icon name="lock" className="text-accent-mark mt-0.5 h-5 w-5 shrink-0" />
        <span>{t.start.privacy}</span>
      </p>
      <Button type="submit" size="lg" className="mt-8 w-full" trailingArrow>
        {t.profile.continue}
      </Button>
    </form>
  );
}

function CvResults({
  t,
  raterT,
  rating,
  rules,
  contractHref,
  onAgain,
  locale,
}: {
  locale: string;
  t: CvMessages;
  raterT: RaterMessages;
  rating: CvRating;
  rules: Record<string, RuleText>;
  contractHref: string;
  onAgain: () => void;
}) {
  const flagged = rating.results.filter((r) => r.verdict !== 'green');
  const passed = rating.results.filter((r) => r.verdict === 'green');
  const dict = { details: { ...raterT.details, ...t.details }, terms: raterT.terms, clauses: raterT.clauses };
  const card = (r: CvResult, compact = false) => (
    <article data-rule={r.id} data-verdict={r.verdict} className={compact ? '' : 'border-border bg-surface rounded-3xl border p-6'}>
      <VerdictBadge verdict={r.verdict} label={raterT.results.verdict[r.verdict]} />
      <h3 className="font-display text-ink mt-3 text-lg font-semibold">{rules[r.id]?.title ?? r.id}</h3>
      {!compact ? <p className="text-ink-soft mt-2">{rules[r.id]?.explain}</p> : null}
      {r.details.length ? (
        <ul className="text-ink-soft mt-3 grid gap-1 text-sm">
          {r.details.map((d, i) => (
            <li key={i} className="num">
              {renderDetail(d, dict, locale)}
            </li>
          ))}
        </ul>
      ) : null}
      {r.aiJudgment ? <p className="text-ink-muted mt-2 text-xs font-medium">{t.results.aiJudgment}</p> : null}
      {!compact ? r.quotes.map((q, i) => <EvidenceQuote key={i} excerpt={q} source={t.results.fromCv} className="mt-3" />) : null}
      {r.id === 'C03_TARGET_JOB_ALLOWED' && r.verdict !== 'green' ? (
        <p className="mt-3">
          <ButtonLink href={contractHref} variant="quiet">
            {t.results.contractLink}
          </ButtonLink>
        </p>
      ) : null}
    </article>
  );

  return (
    <div className="mx-auto grid max-w-[46rem] gap-6">
      <h1 className="sr-only">{t.results.title}</h1>
      <section className="border-border bg-surface rounded-3xl border px-6 py-8">
        <ScoreGauge score={rating.score} verdict={rating.verdict} verdictLabel={t.results.verdictLong[rating.verdict]} outOf={raterT.results.outOf} />
      </section>
      {rating.unverified ? (
        <p role="note" className="border-score-amber bg-surface text-ink flex gap-3 rounded-2xl border-s-4 px-4 py-3 text-sm">
          <Icon name="verdict-yellow" className="text-score-amber mt-0.5 h-5 w-5 shrink-0" />
          <span>{t.results.draftNotice}</span>
        </p>
      ) : null}
      {flagged.length ? (
        <ol className="grid gap-4">
          {flagged.map((r) => (
            <li key={r.id}>{card(r)}</li>
          ))}
        </ol>
      ) : null}
      {rating.suggestions.length ? (
        <section aria-labelledby="cv-suggestions" className="border-border bg-surface rounded-3xl border p-6">
          <h2 id="cv-suggestions" className="text-ink text-xl">
            {t.results.suggestions}
          </h2>
          <p className="text-ink-muted mt-2 text-sm">{t.results.suggestionsNote}</p>
          <ul className="mt-4 grid gap-4">
            {rating.suggestions.map((s, i) => (
              <li key={i}>
                <EvidenceQuote excerpt={s.excerpt} source={t.results.fromCv} />
                <p className="text-ink mt-2">{s.suggestion}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {passed.length ? (
        <details className="border-border bg-surface rounded-3xl border">
          <summary className="text-ink flex min-h-14 cursor-pointer list-none items-center gap-3 px-6 font-semibold [&::-webkit-details-marker]:hidden">
            <Icon name="verdict-green" className="text-score-green h-5 w-5" />
            {fill(raterT.results.passed, { count: passed.length })}
          </summary>
          <ul className="grid gap-3 px-6 pb-6">
            {passed.map((r) => (
              <li key={r.id}>{card(r, true)}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p>
        <Button variant="secondary" onClick={onAgain}>
          {t.results.again}
        </Button>
      </p>
    </div>
  );
}
