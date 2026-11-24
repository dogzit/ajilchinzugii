'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CaseMessages } from './case-intake';

export function CaseDelete({ t }: { t: CaseMessages }) {
  const [state, setState] = useState<'idle' | 'busy' | 'deleted' | 'invalid'>('idle');
  const remove = async () => {
    setState('busy');
    const token = decodeURIComponent(window.location.hash.slice(1));
    const response = await fetch('/api/rater/cases/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const body = response?.ok ? ((await response.json()) as { deleted: boolean }) : null;
    setState(body?.deleted ? 'deleted' : 'invalid');
  };
  return (
    <section aria-labelledby="case-delete" className="mx-auto max-w-[36rem]">
      <h1 id="case-delete" className="text-ink">
        {t.deleteTitle}
      </h1>
      {state === 'deleted' ? (
        <p role="status" className="text-ink mt-5 text-lg">
          {t.deleted}
        </p>
      ) : state === 'invalid' ? (
        <p role="alert" className="text-ink mt-5 text-lg">
          {t.deleteInvalid}
        </p>
      ) : (
        <>
          <p className="text-ink-soft mt-5">{t.deleteBody}</p>
          <Button variant="secondary" className="mt-6" onClick={remove} disabled={state === 'busy'}>
            {t.deleteButton}
          </Button>
        </>
      )}
    </section>
  );
}
