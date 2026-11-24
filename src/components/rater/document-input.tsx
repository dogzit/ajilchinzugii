'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDrop } from '@/components/ui/file-drop';
import { Icon } from '@/components/ui/icon';
import { MIN_OCR_CONFIDENCE, ocrEngine } from '@/lib/extraction/ocr';
import type { Extraction } from '@/lib/rater/fields';
import { fill } from '@/lib/rater/present';
import type { RaterMessages } from './types';

export type Extracted = { text: string; fields: Extraction; dropped: string[] };

type State =
  | { kind: 'idle' }
  | { kind: 'ocr'; percent: number }
  | { kind: 'reading' }
  | { kind: 'low_confidence' }
  | { kind: 'error'; code: string };

/**
 * Paste text, or give a photo or a file. Photos are read on the phone and
 * only their text is sent; PDF and Word files go to the server, which reads
 * them in memory. Either way the next screen is the confirmation of what was
 * read — nothing is rated until the reader has seen it.
 */
export function DocumentInput({
  t,
  mode,
  onExtracted,
  onQuestionnaire,
  onBack,
}: {
  t: RaterMessages;
  mode: 'paste' | 'upload';
  onExtracted: (result: Extracted) => void;
  onQuestionnaire: () => void;
  onBack: () => void;
}) {
  const d = t.document;
  const [text, setText] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const busy = state.kind === 'ocr' || state.kind === 'reading';

  const send = async (body: BodyInit, json: boolean) => {
    setState({ kind: 'reading' });
    try {
      const response = await fetch('/api/rater/extract', {
        method: 'POST',
        body,
        headers: json ? { 'content-type': 'application/json' } : undefined,
      });
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string };
        setState({ kind: 'error', code: error ?? 'generic' });
        return;
      }
      onExtracted(await response.json());
    } catch {
      setState({ kind: 'error', code: 'generic' });
    }
  };

  const onFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      setState({ kind: 'ocr', percent: 0 });
      try {
        const result = await ocrEngine().recognize(file, (p) => setState({ kind: 'ocr', percent: Math.round(p * 100) }));
        if (result.confidence < MIN_OCR_CONFIDENCE || result.text.trim().length < 40) {
          setState({ kind: 'low_confidence' });
          return;
        }
        await send(JSON.stringify({ text: result.text }), true);
      } catch {
        setState({ kind: 'low_confidence' });
      }
      return;
    }
    const form = new FormData();
    form.append('file', file);
    await send(form, false);
  };

  const errorText = (code: string) => (code === 'not_configured' ? d.notConfigured : ((d.errors as Record<string, string>)[code] ?? d.errors.generic));

  return (
    <div className="mx-auto max-w-[40rem]">
      <button type="button" onClick={onBack} className="text-accent-text hover:text-ink inline-flex min-h-11 items-center gap-1.5 font-medium">
        <Icon name="arrow-left" className="h-4 w-4" />
        {t.nav.back}
      </button>
      <h2 ref={heading} tabIndex={-1} className="text-ink mt-6 outline-none">
        {mode === 'paste' ? d.pasteTitle : d.uploadTitle}
      </h2>

      {mode === 'paste' ? (
        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void send(JSON.stringify({ text }), true);
          }}
        >
          <label htmlFor="contract-text" className="text-ink font-medium">
            {d.pasteLabel}
          </label>
          <p id="contract-text-help" className="text-ink-muted mt-1 text-sm">
            {d.pasteHelp}
          </p>
          <textarea
            id="contract-text"
            aria-describedby="contract-text-help"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={14}
            maxLength={80_000}
            className="border-border-strong bg-surface text-ink focus-visible:outline-focus mt-3 block w-full rounded-2xl border p-4 leading-relaxed"
          />
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy || text.trim().length < 40}>
            {state.kind === 'reading' ? d.reading : d.read}
          </Button>
        </form>
      ) : (
        <div className="mt-6 grid gap-4">
          <FileDrop accept="image/*" capture="environment" icon="camera" title={d.takePhoto} hint={d.takePhotoHint} onFile={onFile} />
          <FileDrop
            accept="image/*,application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            icon="upload"
            title={d.pickFile}
            hint={d.pickFileHint}
            onFile={onFile}
          />
          <p className="text-ink-muted flex gap-2 text-sm">
            <Icon name="lock" className="text-accent-mark mt-0.5 h-4 w-4 shrink-0" />
            {d.ocrPrivacy}
          </p>
        </div>
      )}

      <div aria-live="polite" className="mt-6">
        {state.kind === 'ocr' ? <p className="text-ink num">{fill(d.ocrReading, { percent: state.percent })}</p> : null}
        {state.kind === 'reading' && mode === 'upload' ? <p className="text-ink">{d.reading}</p> : null}
      </div>

      {state.kind === 'low_confidence' || state.kind === 'error' ? (
        <div role="alert" className="border-score-amber bg-surface rounded-2xl border-s-4 p-5">
          <p className="text-ink">{state.kind === 'low_confidence' ? d.lowConfidence : errorText(state.code)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={onQuestionnaire}>{d.toQuestionnaire}</Button>
            <Button variant="secondary" onClick={() => setState({ kind: 'idle' })}>
              {d.tryAgain}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
