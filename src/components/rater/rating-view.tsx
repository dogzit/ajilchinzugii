'use client';

import { useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import { SaveToAccount } from '@/components/accounts/save-to-account';
import type { AccountMessages } from '@/components/accounts/sign-up-gate';
import { EvidenceQuote } from '@/components/ui/evidence-quote';
import { Icon } from '@/components/ui/icon';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { VerdictBadge } from '@/components/ui/verdict-badge';
import type { Rating, RuleResult } from '@/lib/rater/engine';
import type { ContractFields } from '@/lib/rater/fields';
import { fill, renderDetail } from '@/lib/rater/present';
import type { TemplateDoc } from '@/lib/rater/template';
import type { RaterMessages, RuleText } from './types';

export type RatingRequestBody = { fields: ContractFields; actual?: ContractFields; corrected?: string[] };

/**
 * The result: the score and the verdict first, the 108 line at once on a P1,
 * then the items — red, then yellow, then the passed rules folded away. Each
 * item gives its verdict in words, the explanation from rules.yaml word for
 * word, the article, and the excerpt it was read from.
 */
export function RatingView({
  t,
  rating,
  rules,
  request,
  locale,
  onTalk,
  onStartOver,
  accountT,
}: {
  accountT: AccountMessages;
  t: RaterMessages;
  rating: Rating;
  rules: Record<string, RuleText>;
  request: RatingRequestBody;
  locale: string;
  onTalk: () => void;
  onStartOver: () => void;
}) {
  const r = t.results;
  // Failed rules in full; rules that could not be checked folded into their
  // own group, so a list of "don't know" answers never buries a red result.
  const flagged = rating.results.filter((x) => x.verdict !== 'green' && x.status === 'fail');
  const unknown = rating.results.filter((x) => x.status === 'unknown');
  const passed = rating.results.filter((x) => x.verdict === 'green');
  const hasFailures = rating.results.some((x) => x.status === 'fail');

  return (
    <div className="mx-auto grid max-w-[46rem] gap-6">
      <h2 className="sr-only">{r.title}</h2>
      <section className="border-border bg-surface rounded-3xl border px-6 py-8">
        <ScoreGauge
          score={rating.score}
          verdict={rating.verdict}
          verdictLabel={r.verdictLong[rating.verdict]}
          outOf={r.outOf}
        />
        <p className="num text-ink-muted mt-5 text-center text-xs">
          {fill(r.ruleSet, { version: rating.ruleSetVersion, date: rating.ratedOn })}
        </p>
      </section>

      {rating.unverified ? (
        <p role="note" className="border-score-amber bg-surface text-ink flex gap-3 rounded-2xl border-s-4 px-4 py-3 text-sm">
          <Icon name="verdict-yellow" className="text-score-amber mt-0.5 h-5 w-5 shrink-0" />
          <span>{t.draftNotice}</span>
        </p>
      ) : null}

      {rating.p1 ? (
        <section aria-labelledby="urgent" className="border-score-red bg-surface rounded-3xl border-2 p-6">
          <h3 id="urgent" className="text-ink flex items-center gap-2">
            <Icon name="verdict-red" className="text-score-red h-6 w-6" strokeWidth={2} />
            {r.urgentTitle}
          </h3>
          <p className="text-ink-soft mt-3">{r.urgentBody}</p>
          <a
            href="tel:108"
            className="bg-accent text-accent-ink border-accent-mark mt-5 inline-flex min-h-13 items-center gap-2 rounded-full border px-7 font-semibold"
          >
            <Icon name="phone" className="h-5 w-5" />
            {r.call108}
          </a>
        </section>
      ) : null}

      {flagged.length ? (
        <section aria-labelledby="issues">
          <h3 id="issues" className="text-ink mt-4">
            {r.issues}
          </h3>
          <ol className="mt-4 grid gap-4">
            {flagged.map((result) => (
              <li key={result.id}>
                <ResultCard result={result} rule={rules[result.id]} t={t} locale={locale} fields={request.actual ?? request.fields} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {unknown.length ? (
        <details open={!flagged.length} className="border-border bg-surface rounded-3xl border">
          <summary className="text-ink flex min-h-14 cursor-pointer list-none items-center gap-3 px-6 font-semibold [&::-webkit-details-marker]:hidden">
            <Icon name="verdict-yellow" className="text-score-amber h-5 w-5" />
            {fill(r.unknownGroup, { count: unknown.length })}
          </summary>
          <p className="text-ink-muted px-6 text-sm">{r.unknownLead}</p>
          <ul className="grid gap-4 px-6 py-6">
            {unknown.map((result) => (
              <li key={result.id}>
                <ResultCard result={result} rule={rules[result.id]} t={t} locale={locale} fields={request.actual ?? request.fields} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {passed.length ? (
        <details className="border-border bg-surface rounded-3xl border">
          <summary className="text-ink flex min-h-14 cursor-pointer list-none items-center gap-3 px-6 font-semibold [&::-webkit-details-marker]:hidden">
            <Icon name="verdict-green" className="text-score-green h-5 w-5" />
            {fill(r.passed, { count: passed.length })}
          </summary>
          <ul className="grid gap-3 px-6 pb-6">
            {passed.map((result) => (
              <li key={result.id}>
                <ResultCard result={result} rule={rules[result.id]} t={t} locale={locale} fields={request.actual ?? request.fields} compact />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {rating.notChecked.length ? (
        <p className="text-ink-muted text-sm">
          {fill(r.notChecked, { rules: rating.notChecked.map((id) => rules[id]?.title ?? id).join(', ') })}
        </p>
      ) : null}

      {hasFailures ? <EmployerMessage t={t} request={request} /> : null}
      <SaveToAccount
        t={accountT}
        locale={locale}
        kind="contract"
        summary={{
          ruleSetVersion: rating.ruleSetVersion,
          verdict: rating.verdict,
          score: rating.score,
          results: rating.results.map((r) => ({ id: r.id, verdict: r.verdict })),
        }}
      />
      <TemplateActions t={t} request={request} locale={locale} />

      {rating.verdict === 'red' ? (
        <section aria-labelledby="talk" className="bg-panel rounded-[2rem] px-7 py-10">
          <h3 id="talk" className="text-panel-ink">
            {r.talkTitle}
          </h3>
          <p className="text-panel-ink/80 mt-3">{r.talkBody}</p>
          <Button size="lg" className="mt-6" onClick={onTalk}>
            {r.talk}
          </Button>
        </section>
      ) : null}

      <p>
        <Button variant="secondary" onClick={onStartOver}>
          {t.nav.startOver}
        </Button>
      </p>
    </div>
  );
}

function ResultCard({
  result,
  rule,
  t,
  locale,
  fields,
  compact = false,
}: {
  result: RuleResult;
  rule?: RuleText;
  t: RaterMessages;
  locale: string;
  fields: ContractFields;
  compact?: boolean;
}) {
  const r = t.results;
  // Two fields often cite the same line (a shift's start and end): show it once.
  const excerpts = [
    ...new Set([
      ...result.evidence.map((path) => fields.evidence[path]?.excerpt).filter((x): x is string => Boolean(x)),
      ...result.quotes,
    ]),
  ];

  return (
    <article data-rule={result.id} data-verdict={result.verdict} className={compact ? '' : 'border-border bg-surface rounded-3xl border p-6'}>
      <VerdictBadge verdict={result.verdict} label={r.verdict[result.verdict]} />
      <h4 className="font-display text-ink mt-3 text-lg font-semibold">{rule?.title ?? result.id}</h4>
      {!compact && rule ? (
        <p className="text-ink-soft mt-2 leading-relaxed">
          {rule.explain}
          {rule.unofficial ? <span className="text-ink-muted"> ({r.unofficialTranslation})</span> : null}
        </p>
      ) : null}
      {result.details.length ? (
        <ul className="text-ink-soft mt-3 grid gap-1 text-sm">
          {result.details.map((detail, index) => (
            <li key={index} className="num">
              {renderDetail(detail, t, locale)}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-accent-text mt-3 text-sm font-medium">
        {rule?.article ? fill(r.article, { article: rule.article }) : r.articleTbd}
      </p>
      {result.aiJudgment ? <p className="text-ink-muted mt-1 text-xs font-medium">{r.aiJudgment}</p> : null}
      {result.basis === 'actual' ? <p className="text-ink-muted mt-1 text-xs font-medium">{r.basisActual}</p> : null}
      {!compact
        ? excerpts.map((excerpt, index) => <EvidenceQuote key={index} excerpt={excerpt} source={r.evidenceSource} className="mt-3" />)
        : null}
    </article>
  );
}

async function post(url: string, body: RatingRequestBody): Promise<Response> {
  return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

function EmployerMessage({ t, request }: { t: RaterMessages; request: RatingRequestBody }) {
  const m = t.message;
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [message, setMessage] = useState<{ text: string; source: 'ai' | 'template' } | null>(null);

  const generate = async () => {
    setState('busy');
    try {
      const response = await post('/api/rater/message', request);
      if (!response.ok) throw new Error();
      setMessage(await response.json());
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return (
    <section aria-labelledby="employer-message" className="border-border bg-surface rounded-3xl border p-6">
      <h3 id="employer-message" className="text-ink">
        {m.title}
      </h3>
      <p className="text-ink-muted mt-2">{m.body}</p>
      {message ? (
        <div className="mt-5">
          <label htmlFor="employer-message-text" className="text-ink font-medium">
            {m.label}
          </label>
          <textarea
            id="employer-message-text"
            readOnly
            value={message.text}
            rows={12}
            className="border-border-strong bg-surface text-ink mt-2 block w-full rounded-2xl border p-4 leading-relaxed"
          />
          <p className="text-ink-muted mt-2 text-xs">{message.source === 'ai' ? m.aiNote : m.templateNote}</p>
          <div className="mt-3">
            <CopyButton value={message.text} label={m.copy} copiedLabel={m.copied} failedLabel={m.copyFailed} />
          </div>
        </div>
      ) : (
        <Button className="mt-5" onClick={generate} disabled={state === 'busy'}>
          <Icon name="chat" className="h-4 w-4" />
          {state === 'busy' ? m.generating : m.generate}
        </Button>
      )}
      {state === 'error' ? (
        <p role="alert" className="text-ink mt-3 text-sm">
          {m.error}
        </p>
      ) : null}
    </section>
  );
}

function TemplateActions({ t, request, locale }: { t: RaterMessages; request: RatingRequestBody; locale: string }) {
  const tp = t.template;
  const [doc, setDoc] = useState<TemplateDoc | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');

  const run = async (format: 'json' | 'pdf') => {
    setState('busy');
    try {
      const response = await post(`/api/rater/template?format=${format}&locale=${locale}`, request);
      if (!response.ok) throw new Error();
      if (format === 'pdf') {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contract-template.pdf';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } else {
        setDoc(await response.json());
        requestAnimationFrame(() => window.print());
      }
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return (
    <section aria-labelledby="template" className="border-border bg-surface rounded-3xl border p-6">
      <h3 id="template" className="text-ink">
        {tp.title}
      </h3>
      <p className="text-ink-muted mt-2">{tp.body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => run('json')} disabled={state === 'busy'}>
          <Icon name="printer" className="h-4 w-4" />
          {tp.print}
        </Button>
        <Button variant="secondary" onClick={() => run('pdf')} disabled={state === 'busy'}>
          <Icon name="download" className="h-4 w-4" />
          {state === 'busy' ? tp.preparing : tp.download}
        </Button>
      </div>
      {state === 'error' ? (
        <p role="alert" className="text-ink mt-3 text-sm">
          {tp.error}
        </p>
      ) : null}
      {doc ? (
        <article className="print-only mt-6">
          <h1>{doc.title}</h1>
          <p>{doc.note}</p>
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.lines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </section>
          ))}
        </article>
      ) : null}
    </section>
  );
}
