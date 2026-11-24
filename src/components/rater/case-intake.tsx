'use client';

import type mnMessages from '@messages/tools/mn.json';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { fill } from '@/lib/rater/present';
import { Choice } from './inputs';
import type { RatingRequestBody } from './rating-view';

export type CaseMessages = (typeof mnMessages)['cases'];
type Priority = 'P1' | 'P2' | 'P3';
type Result =
  | { accepted: true; caseId: string; priority: Priority; overCapacity: boolean; fileStored: boolean; deleteLink: string }
  | { accepted: false; reason: 'over_capacity'; askAgainFrom: string }
  | { accepted: false; reason: 'not_red' };

/**
 * "Talk to Ajilchin Zugii" (spec, "Escalations"): how to reach the person,
 * consent to be contacted, and — unticked by default — saving the document
 * so a caseworker can help. Works without an account. The priority shown is
 * the server's; the form never sends one.
 */
export function CaseIntake({
  t,
  locale,
  request,
  priority,
  minor,
  documentText,
  contactEmail,
  phoneLabel,
  onBack,
}: {
  t: CaseMessages;
  locale: string;
  request: RatingRequestBody;
  priority: Priority;
  minor: boolean;
  /** The redacted text of a document, if the rating came from one. */
  documentText: string | null;
  contactEmail: string | null;
  phoneLabel: string;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<'phone' | 'facebook' | null>(null);
  const [contact, setContact] = useState('');
  const [bestTime, setBestTime] = useState<'morning' | 'day' | 'evening' | null>(null);
  const [description, setDescription] = useState('');
  const [consent, setConsent] = useState(false);
  const [store, setStore] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'off'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return;
    fetch('/api/account/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { signedIn?: boolean } | null) => setSignedIn(Boolean(me?.signedIn)))
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    setState('busy');
    try {
      const response = await fetch('/api/rater/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...request,
          locale,
          intake: {
            contactMethod: method,
            contact,
            bestTime,
            description: description || null,
            consentToContact: consent,
            storeFile: store,
            guardianConsent: guardian,
            deleteEmail: email || null,
            text: store ? documentText : null,
          },
        }),
      });
      if (response.status === 503) return setState('off');
      if (!response.ok) return setState('error');
      setResult(await response.json());
      setState('idle');
    } catch {
      setState('error');
    }
  };

  const back = (
    <button type="button" onClick={onBack} className="text-accent-text hover:text-ink mt-8 inline-flex min-h-11 items-center gap-1.5 font-medium">
      <Icon name="arrow-left" className="h-4 w-4" />
      {t.backToResults}
    </button>
  );

  if (result?.accepted) {
    return (
      <section aria-labelledby="case-done" className="mx-auto max-w-[40rem]">
        <h2 id="case-done" className="text-ink">
          {t.doneTitle}
        </h2>
        <p className="text-ink mt-4 text-lg">{fill(t.done, { caseId: result.caseId, time: t.responseTime[result.priority] })}</p>
        {result.overCapacity ? <p className="text-ink-muted mt-2">{t.overCapacityNote}</p> : null}
        {store && !result.fileStored ? <p className="text-ink-muted mt-2">{t.fileNotStored}</p> : null}
        <div className="border-border bg-surface mt-6 rounded-3xl border p-5">
          <h3 className="text-ink text-lg">{t.deleteLinkTitle}</h3>
          <p className="text-ink-muted mt-1 text-sm">{t.deleteLinkBody}</p>
          <p className="text-ink mt-3 text-sm break-all select-all">{result.deleteLink}</p>
        </div>
        {back}
      </section>
    );
  }

  if (result && !result.accepted && result.reason === 'over_capacity') {
    return (
      <section aria-labelledby="self-help" className="mx-auto max-w-[40rem]">
        <h2 id="self-help" className="text-ink">
          {t.selfHelpTitle}
        </h2>
        <p className="text-ink-soft mt-4">{fill(t.selfHelpBody, { date: result.askAgainFrom })}</p>
        {back}
      </section>
    );
  }

  return (
    <form
      className="mx-auto max-w-[40rem]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-ink">{t.title}</h2>
      <p className="text-ink-soft mt-3">{t.lead}</p>
      <p className="mt-4 flex flex-wrap items-center gap-3">
        <span className="bg-surface-tint border-border text-ink rounded-full border px-3 py-1 text-sm font-medium">{fill(t.response, { time: t.responseTime[priority] })}</span>
        <a href="tel:108" className="text-accent-text inline-flex min-h-11 items-center gap-1.5 font-medium underline">
          <Icon name="phone" className="h-4 w-4" />
          {phoneLabel}
        </a>
      </p>
      {signedIn ? <p className="text-ink-muted mt-2 text-sm">{t.linkedAccount}</p> : null}

      {state === 'off' ? (
        <p role="alert" className="border-score-amber bg-surface text-ink mt-6 rounded-2xl border-s-4 p-4">
          {t.notConfigured} {contactEmail ? <span className="select-all">{contactEmail}</span> : null}
        </p>
      ) : null}

      <div className="mt-8 grid gap-7">
        <Choice legend={t.contactMethod} columns value={method} onChange={setMethod} options={[{ value: 'phone', label: t.phone }, { value: 'facebook', label: t.facebook }]} />
        <div>
          <label htmlFor="case-contact" className="text-ink font-medium">
            {t.contact}
          </label>
          <input id="case-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} required autoComplete="tel" className="border-border-strong bg-surface text-ink mt-2 block min-h-12 w-full rounded-2xl border px-4" />
        </div>
        <Choice legend={t.bestTime} columns value={bestTime} onChange={setBestTime} options={[{ value: 'morning', label: t.morning }, { value: 'day', label: t.day }, { value: 'evening', label: t.evening }]} />
        <div>
          <label htmlFor="case-description" className="text-ink font-medium">
            {t.description}
          </label>
          <textarea id="case-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="border-border-strong bg-surface text-ink mt-2 block w-full rounded-2xl border p-4" />
        </div>
        <label className="text-ink flex items-start gap-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="accent-accent-mark mt-1 h-5 w-5" />
          {t.consent}
        </label>
        {documentText ? (
          <label className="text-ink flex items-start gap-3">
            <input type="checkbox" checked={store} onChange={(e) => setStore(e.target.checked)} className="accent-accent-mark mt-1 h-5 w-5" />
            <span>
              {t.store}
              <span className="text-ink-muted mt-1 block text-sm">{t.storeHelp}</span>
            </span>
          </label>
        ) : null}
        {minor ? (
          <label className="text-ink flex items-start gap-3">
            <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} className="accent-accent-mark mt-1 h-5 w-5" />
            <span>
              {t.guardian}
              <span className="text-ink-muted mt-1 block text-sm">{t.guardianHelp}</span>
            </span>
          </label>
        ) : null}
        <div>
          <label htmlFor="case-email" className="text-ink font-medium">
            {t.deleteEmail}
          </label>
          <p id="case-email-help" className="text-ink-muted mt-1 text-sm">
            {t.deleteEmailHelp}
          </p>
          <input id="case-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="case-email-help" maxLength={200} className="border-border-strong bg-surface text-ink mt-2 block min-h-12 w-full rounded-2xl border px-4" />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-10 w-full" disabled={state === 'busy' || !method || contact.trim().length < 3 || !consent}>
        {state === 'busy' ? t.sending : t.submit}
      </Button>
      {state === 'error' ? (
        <p role="alert" className="text-ink mt-3">
          {t.error}
        </p>
      ) : null}
      {back}
    </form>
  );
}
