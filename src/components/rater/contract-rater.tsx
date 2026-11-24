'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import type { Rating } from '@/lib/rater/engine';
import { answersToFields, emptyAnswers, type Answers } from '@/lib/rater/questionnaire';
import type { AccountMessages } from '@/components/accounts/sign-up-gate';
import { CaseIntake, type CaseMessages } from './case-intake';
import { ConfirmFields } from './confirm-fields';
import { DocumentInput, type Extracted } from './document-input';
import { Questionnaire } from './questionnaire';
import { RatingView, type RatingRequestBody } from './rating-view';
import type { CategoryOption, RaterMessages, RuleText } from './types';

type Step =
  | { name: 'start' }
  | { name: 'questions'; index: number }
  | { name: 'document'; mode: 'paste' | 'upload' }
  | { name: 'confirm' }
  | { name: 'results' }
  | { name: 'help' };

/**
 * The contract rater, start to result, in one page and in memory: nothing
 * the reader types goes into a URL, a cookie or storage. Reloading the page
 * forgets it all, which is the point.
 */
export function ContractRater({
  t,
  rules,
  categories,
  locale,
  privacyHref,
  contactEmail,
  accountT,
  casesT,
}: {
  accountT: AccountMessages;
  casesT: CaseMessages;
  t: RaterMessages;
  rules: Record<string, RuleText>;
  categories: CategoryOption[];
  locale: string;
  privacyHref: string;
  contactEmail: string | null;
}) {
  const [step, setStep] = useState<Step>({ name: 'start' });
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [request, setRequest] = useState<RatingRequestBody | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  const rateNow = async (body: RatingRequestBody) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/rater/rate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.status === 429) throw new Error(t.nav.tooMany);
      if (!response.ok) throw new Error(t.nav.error);
      setRequest(body);
      setRating(await response.json());
      setStep({ name: 'results' });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.nav.error);
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setAnswers(emptyAnswers());
    setExtracted(null);
    setRequest(null);
    setRating(null);
    setStep({ name: 'start' });
  };

  if (step.name === 'questions') {
    return (
      <>
        <Questionnaire
          t={t}
          categories={categories}
          answers={answers}
          onChange={(patch) => setAnswers((a) => ({ ...a, ...patch }))}
          step={step.index}
          onStep={(index) => setStep({ name: 'questions', index })}
          onExit={() => setStep({ name: 'start' })}
          onDone={() => rateNow({ fields: answersToFields(answers) })}
          busy={busy}
        />
        {error ? (
          <p role="alert" className="text-ink mx-auto mt-4 max-w-[40rem]">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  if (step.name === 'document') {
    return (
      <DocumentInput
        t={t}
        mode={step.mode}
        onBack={() => setStep({ name: 'start' })}
        onQuestionnaire={() => setStep({ name: 'questions', index: 0 })}
        onExtracted={(result) => {
          setExtracted(result);
          setStep({ name: 'confirm' });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (step.name === 'confirm' && extracted) {
    return (
      <>
        <ConfirmFields
          t={t}
          extracted={extracted.fields}
          dropped={extracted.dropped}
          categories={categories}
          busy={busy}
          onBack={() => setStep({ name: 'start' })}
          onConfirm={rateNow}
        />
        {error ? (
          <p role="alert" className="text-ink mx-auto mt-4 max-w-[46rem]">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  if (step.name === 'results' && rating && request) {
    return (
      <RatingView
        t={t}
        rating={rating}
        rules={rules}
        request={request}
        locale={locale}
        accountT={accountT}
        onTalk={() => setStep({ name: 'help' })}
        onStartOver={startOver}
      />
    );
  }

  if (step.name === 'help' && request && rating?.priority) {
    return (
      <CaseIntake
        t={casesT}
        locale={locale}
        request={request}
        priority={rating.priority}
        minor={['under_13', '13_14', '15_17', 'unknown'].includes(rating.ageBand)}
        documentText={request.fields.source === 'document' ? (extracted?.text ?? null) : null}
        contactEmail={contactEmail}
        phoneLabel={t.results.call108}
        onBack={() => setStep({ name: 'results' })}
      />
    );
  }

  const choices = [
    {
      key: 'questionnaire',
      icon: 'clipboard' as IconName,
      title: t.start.questionnaireTitle,
      body: t.start.questionnaireBody,
      onPick: () => setStep({ name: 'questions', index: 0 }),
    },
    {
      key: 'paste',
      icon: 'document' as IconName,
      title: t.start.pasteTitle,
      body: t.start.pasteBody,
      onPick: () => setStep({ name: 'document', mode: 'paste' }),
    },
    {
      key: 'upload',
      icon: 'upload' as IconName,
      title: t.start.uploadTitle,
      body: t.start.uploadBody,
      onPick: () => setStep({ name: 'document', mode: 'upload' }),
    },
  ];

  return (
    <div className="mx-auto max-w-[46rem]">
      <Pill>{t.start.eyebrow}</Pill>
      <h1 className="text-ink mt-5">{t.start.title}</h1>
      <p className="text-ink-muted mt-4 text-lg">{t.start.lead}</p>

      <ul className="mt-10 grid gap-4">
        {choices.map((choice) => (
          <li key={choice.key}>
            <button
              type="button"
              onClick={choice.onPick}
              className="border-border bg-surface hover:border-accent-mark flex w-full items-center gap-5 rounded-3xl border p-5 text-start sm:p-6"
            >
              <span className="bg-accent text-accent-ink border-accent-mark inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border">
                <Icon name={choice.icon} />
              </span>
              <span className="flex-1">
                <span className="font-display text-ink block text-lg font-semibold">{choice.title}</span>
                <span className="text-ink-muted mt-1 block">{choice.body}</span>
              </span>
              <Icon name="arrow-right" className="text-ink-muted h-5 w-5 shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      <p className="border-border bg-surface text-ink-soft mt-8 flex gap-3 rounded-2xl border px-4 py-3 text-sm">
        <Icon name="lock" className="text-accent-mark mt-0.5 h-5 w-5 shrink-0" />
        <span>
          {t.start.privacy}{' '}
          <a href={privacyHref} className="text-accent-text underline">
            {t.start.privacyLink}
          </a>
        </span>
      </p>
      <p role="note" className="border-score-amber bg-surface text-ink mt-3 flex gap-3 rounded-2xl border-s-4 px-4 py-3 text-sm">
        <Icon name="verdict-yellow" className="text-score-amber mt-0.5 h-5 w-5 shrink-0" />
        <span>{t.draftNotice}</span>
      </p>
    </div>
  );
}
