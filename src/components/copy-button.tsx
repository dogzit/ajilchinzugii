'use client';

import { useState } from 'react';

type State = 'idle' | 'copied' | 'failed';

/**
 * The only control on the public site that needs JavaScript. Its labels are
 * passed in by the server component that renders it, so no translation
 * runtime reaches the browser; without JavaScript the text beside it is still
 * selectable.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  failedLabel: string;
}) {
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
      className="border-border-strong text-ink-soft hover:bg-surface-tint hover:text-ink inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium"
    >
      <span aria-hidden="true" className="text-accent-mark">
        {state === 'copied' ? '✓' : '⧉'}
      </span>
      <span>{label}</span>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : ''}
      </span>
    </button>
  );
}
