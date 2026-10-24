'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type State = 'idle' | 'copied' | 'failed';

/**
 * One of only two interactive controls on the site that need JavaScript.
 * Without it the text is still selectable, so nothing is lost.
 */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useTranslations('common');
  const [state, setState] = useState<State>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="border-border-strong text-ink-soft hover:bg-surface-muted hover:text-ink inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-sm"
    >
      <span aria-hidden="true" className="text-accent-mark">
        {state === 'copied' ? '✓' : '⧉'}
      </span>
      <span>{label ?? t('copy')}</span>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? t('copied') : state === 'failed' ? t('copyFailed') : ''}
      </span>
    </button>
  );
}
