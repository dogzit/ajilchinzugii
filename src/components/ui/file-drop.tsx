'use client';

import { useId, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

/**
 * Pick a file, or drop one. A real `<input type="file">` does the work — the
 * label is the visible target, so a tap, a click, Enter or Space all open
 * the picker, and the input keeps its own accessible name.
 */
export function FileDrop({
  accept,
  icon = 'upload',
  title,
  hint,
  capture,
  onFile,
}: {
  accept: string;
  icon?: IconName;
  title: string;
  hint?: string;
  /** Opens the camera directly on a phone. */
  capture?: 'environment';
  onFile: (file: File) => void;
}) {
  const id = useId();
  const [over, setOver] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`border-border-strong focus-within:outline-focus flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center focus-within:outline-2 focus-within:outline-offset-2 ${over ? 'bg-surface-tint' : 'bg-surface'}`}
    >
      <Icon name={icon} className="text-accent-text h-7 w-7" />
      <span className="text-ink font-medium">{title}</span>
      {hint ? <span className="text-ink-muted text-sm">{hint}</span> : null}
      <input
        id={id}
        type="file"
        accept={accept}
        capture={capture}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </label>
  );
}
