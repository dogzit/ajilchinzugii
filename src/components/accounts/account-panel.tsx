'use client';

import { SignOutButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Choice } from '@/components/rater/inputs';
import type { AccountMessages } from './sign-up-gate';

type MemberView = { ageBand: string; targetJob: string | null; aimag: string | null };

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/**
 * The editable part of the account page: finishing the account (age group,
 * guardian consent), the profile, signing out, and deleting everything.
 */
export function AccountPanel({
  t,
  locale,
  member,
  categories,
  aimags,
}: {
  t: AccountMessages;
  locale: string;
  member: MemberView | null;
  categories: { id: string; name: string }[];
  aimags: { id: string; name: string }[];
}) {
  const [band, setBand] = useState<string | null>(member?.ageBand ?? null);
  const [guardian, setGuardian] = useState(false);
  const [targetJob, setTargetJob] = useState<string | null>(member?.targetJob ?? null);
  const [aimag, setAimag] = useState<string | null>(member?.aimag ?? null);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState<'no' | 'yes' | 'error'>('no');
  const minor = band === '13_14' || band === '15_17';
  const router = useRouter();

  const save = async () => {
    const response = await post('/api/account/profile', {
      ageBand: band ?? undefined,
      ...(minor && !member ? { guardianConsent: guardian } : {}),
      targetJob,
      aimag,
    });
    setStatus(response.ok ? 'saved' : 'error');
    if (response.ok && !member) router.refresh();
  };

  const remove = async () => {
    const response = await post('/api/account/delete', {});
    if (response.ok) {
      setDeleted('yes');
      setTimeout(() => router.push(`/${locale}`), 1500);
    } else setDeleted('error');
  };

  if (deleted === 'yes') return <p role="status" className="text-ink">{t.deleteDone}</p>;

  return (
    <>
      <section aria-labelledby="profile" className="border-border bg-surface rounded-3xl border p-6">
        <h2 id="profile" className="text-ink">
          {member ? t.profile : t.completeTitle}
        </h2>
        {!member ? <p className="text-ink-muted mt-2">{t.completeLead}</p> : null}
        <div className="mt-6 grid gap-6">
          {!member ? (
            <Choice legend={t.ageBand} columns value={band} onChange={setBand} options={(['13_14', '15_17', '18_24'] as const).map((v) => ({ value: v, label: t.ages[v] }))} />
          ) : null}
          {!member && minor ? (
            <label className="text-ink flex items-start gap-3">
              <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} className="accent-accent-mark mt-1 h-5 w-5" />
              <span>
                {t.guardianConsent}
                <span className="text-ink-muted mt-1 block text-sm">{t.guardianNote}</span>
              </span>
            </label>
          ) : null}
          <div>
            <label htmlFor="account-job" className="text-ink font-medium">
              {t.targetJob}
            </label>
            <select id="account-job" value={targetJob ?? ''} onChange={(e) => setTargetJob(e.target.value || null)} className="border-border-strong bg-surface text-ink mt-2 block min-h-12 w-full rounded-2xl border px-4">
              <option value="">{t.none}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="account-aimag" className="text-ink font-medium">
              {t.aimag}
            </label>
            <select id="account-aimag" value={aimag ?? ''} onChange={(e) => setAimag(e.target.value || null)} className="border-border-strong bg-surface text-ink mt-2 block min-h-12 w-full rounded-2xl border px-4">
              <option value="">{t.none}</option>
              {aimags.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={!band || (!member && minor && !guardian)}>
            {t.save}
          </Button>
          <span role="status" className="text-ink-muted text-sm">
            {status === 'saved' ? t.saved : null}
          </span>
        </div>
      </section>

      <p>
        <SignOutButton redirectUrl={`/${locale}`}>
          <Button variant="secondary">{t.signOut}</Button>
        </SignOutButton>
      </p>

      <section aria-labelledby="delete" className="border-score-red bg-surface rounded-3xl border-2 p-6">
        <h2 id="delete" className="text-ink">
          {t.deleteTitle}
        </h2>
        <p className="text-ink-soft mt-2">{t.deleteBody}</p>
        <label className="text-ink mt-5 flex items-start gap-3">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="accent-accent-mark mt-1 h-5 w-5" />
          {t.deleteConfirm}
        </label>
        <Button variant="secondary" className="mt-5" disabled={!confirm} onClick={remove}>
          {t.deleteButton}
        </Button>
        {deleted === 'error' ? (
          <p role="alert" className="text-ink mt-3">
            {t.deleteFailed}
          </p>
        ) : null}
      </section>
    </>
  );
}
