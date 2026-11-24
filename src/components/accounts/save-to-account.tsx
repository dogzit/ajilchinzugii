'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AccountMessages } from './sign-up-gate';

type Me = { configured: boolean; signedIn: boolean; member?: { canStore: boolean } | null };
type Summary = { ruleSetVersion: string; verdict: 'red' | 'yellow' | 'green'; score: number; results: { id: string; verdict: string }[] };

/**
 * "Save to my account", under a result. Asks the server who is signed in
 * (no Clerk JavaScript on this page), and saves only when the reader ticks
 * the box: rule ids and colours, the score, the version — nothing else.
 * Without accounts configured it renders nothing.
 */
export function SaveToAccount({
  t,
  locale,
  kind,
  summary,
  cvProfile,
}: {
  t: AccountMessages;
  locale: string;
  kind: 'contract' | 'cv';
  summary: Summary;
  cvProfile?: unknown;
}) {
  const [me, setMe] = useState<Me | null>(null);
  const [rating, setRating] = useState(false);
  const [profile, setProfile] = useState(false);
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return;
    fetch('/api/account/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (!me?.configured) return null;

  const save = async () => {
    const calls: Promise<Response>[] = [];
    const post = (url: string, body: unknown) =>
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (rating) calls.push(post('/api/account/ratings', { kind, ...summary }));
    if (profile && cvProfile) calls.push(post('/api/account/profile', { cvProfile }));
    const responses = await Promise.all(calls);
    setState(responses.every((r) => r.ok) ? 'saved' : 'error');
  };

  return (
    <section aria-labelledby="save-to-account" className="border-border bg-surface rounded-3xl border p-6">
      <h3 id="save-to-account" className="text-ink">
        {t.saveTitle}
      </h3>
      <p className="text-ink-muted mt-2 text-sm">{t.saveBody}</p>
      {!me.signedIn ? (
        <p className="mt-4">
          <a href={`/${locale}/sign-in`} className="text-accent-text underline">
            {t.signInToSave}
          </a>
        </p>
      ) : !me.member?.canStore ? (
        <p className="text-ink mt-4">
          {t.needConsent}{' '}
          <a href={`/${locale}/account`} className="text-accent-text underline">
            {t.navAccount}
          </a>
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="text-ink flex items-center gap-3">
            <input type="checkbox" checked={rating} onChange={(e) => setRating(e.target.checked)} className="accent-accent-mark h-5 w-5" />
            {t.saveCheck}
          </label>
          {cvProfile ? (
            <label className="text-ink flex items-center gap-3">
              <input type="checkbox" checked={profile} onChange={(e) => setProfile(e.target.checked)} className="accent-accent-mark h-5 w-5" />
              {t.saveProfile}
            </label>
          ) : null}
          <p className="flex items-center gap-3">
            <Button onClick={save} disabled={!rating && !profile}>
              {t.save}
            </Button>
            <span role="status" className="text-ink-muted text-sm">
              {state === 'saved' ? t.saved : null}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
