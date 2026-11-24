'use client';

import { SignUp } from '@clerk/nextjs';
import type mnMessages from '@messages/tools/mn.json';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Choice } from '@/components/rater/inputs';

export type AccountMessages = (typeof mnMessages)['account'];
type Band = 'under_13' | '13_14' | '15_17' | '18_24';

/**
 * Before Clerk's sign-up form: the age group. Under 13 gets no account (the
 * tools still work). 13–17 needs a parent or guardian to tick a second box,
 * and the moment they do is recorded. What was chosen travels with the new
 * account and becomes the member row the first time the account page opens.
 */
export function SignUpGate({ t, locale }: { t: AccountMessages; locale: string }) {
  const [band, setBand] = useState<Band | null>(null);
  const [minor, setMinor] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [ready, setReady] = useState(false);
  const isMinor = band === '13_14' || band === '15_17';

  if (ready && band && band !== 'under_13') {
    return (
      <div className="flex justify-center">
        <SignUp
          routing="path"
          path={`/${locale}/sign-up`}
          signInUrl={`/${locale}/sign-in`}
          unsafeMetadata={{ ageBand: band, guardianConsent: isMinor ? guardian : false }}
        />
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-[32rem]"
      onSubmit={(event) => {
        event.preventDefault();
        setReady(true);
      }}
    >
      <h1 className="text-ink">{t.signUpTitle}</h1>
      <p className="text-ink-muted mt-3">{t.signUpLead}</p>
      <div className="mt-8">
        <Choice
          legend={t.ageBand}
          value={band}
          onChange={setBand}
          options={(['under_13', '13_14', '15_17', '18_24'] as const).map((value) => ({ value, label: t.ages[value] }))}
        />
      </div>
      {band === 'under_13' ? (
        <p role="note" className="border-score-amber bg-surface text-ink mt-6 rounded-2xl border-s-4 px-4 py-3">
          {t.under13}
        </p>
      ) : null}
      {isMinor ? (
        <fieldset className="border-accent-mark bg-surface-tint mt-6 grid gap-4 rounded-3xl border p-5">
          <legend className="sr-only">{t.guardianConsent}</legend>
          <label className="text-ink flex items-start gap-3">
            <input type="checkbox" checked={minor} onChange={(e) => setMinor(e.target.checked)} className="accent-accent-mark mt-1 h-5 w-5" />
            {t.minorAge}
          </label>
          <label className="text-ink flex items-start gap-3">
            <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} className="accent-accent-mark mt-1 h-5 w-5" />
            {t.guardianConsent}
          </label>
          <p className="text-ink-muted text-sm">{t.guardianNote}</p>
        </fieldset>
      ) : null}
      <Button type="submit" size="lg" className="mt-8 w-full" disabled={!band || band === 'under_13' || (isMinor && !(minor && guardian))}>
        {t.continue}
      </Button>
    </form>
  );
}
