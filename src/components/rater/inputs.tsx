'use client';

import { useId } from 'react';

/**
 * The questionnaire's controls: native inputs with real labels, large enough
 * to tap, and radio groups whose options are whole cards. Every choice
 * includes "don't know", which the engine rates yellow, never green.
 */

const optionCard =
  'border-border bg-surface has-[:checked]:border-accent-mark has-[:checked]:bg-surface-tint has-[:focus-visible]:outline-focus flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2';

export function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns = false,
  hideLegend = false,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: boolean;
  /** When the screen's heading already asks the question. */
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : 'text-ink mb-3 font-medium'}>{legend}</legend>
      <div className={`grid gap-2 ${columns ? 'sm:grid-cols-3' : ''}`}>
        {options.map((option) => (
          <label key={option.value} className={optionCard}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="accent-accent-mark h-5 w-5 shrink-0"
            />
            <span className="text-ink">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type YesNoValue = 'yes' | 'no' | 'unknown';

export function YesNo({
  legend,
  value,
  onChange,
  labels,
  hideLegend,
}: {
  legend: string;
  value: YesNoValue | null;
  onChange: (value: YesNoValue) => void;
  labels: { yes: string; no: string; unknown: string };
  hideLegend?: boolean;
}) {
  return (
    <Choice
      legend={legend}
      hideLegend={hideLegend}
      columns
      value={value}
      onChange={onChange}
      options={[
        { value: 'yes', label: labels.yes },
        { value: 'no', label: labels.no },
        { value: 'unknown', label: labels.unknown },
      ]}
    />
  );
}

const field =
  'border-border-strong bg-surface text-ink focus-visible:outline-focus mt-2 block min-h-12 w-full rounded-2xl border px-4 text-lg';

export function TextField({
  label,
  help,
  type,
  value,
  onChange,
  min,
  max,
  step,
  inputMode,
}: {
  label: string;
  help?: string;
  type: 'date' | 'time' | 'number';
  value: string;
  onChange: (value: string) => void;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  inputMode?: 'numeric' | 'decimal';
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-ink font-medium">
        {label}
      </label>
      {help ? (
        <p id={`${id}-help`} className="text-ink-muted mt-1 text-sm">
          {help}
        </p>
      ) : null}
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        aria-describedby={help ? `${id}-help` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${field} num`}
      />
    </div>
  );
}

/** A number from a text field: empty or unreadable is null (unknown), never 0. */
export const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
