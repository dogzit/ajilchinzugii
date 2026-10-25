'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/components/theme-script';

/**
 * Auto / Light / Dark.
 *
 * "Auto" is the absence of a choice: it removes the attribute and lets
 * `prefers-color-scheme` decide, which is what the stylesheet does on its
 * own. The other two write an attribute the tokens override on.
 *
 * The current theme is read from the document rather than held in state: the
 * inline script in <head> has already set it before React runs, and reading
 * the same place it writes means the buttons can never disagree with the
 * colours on screen. A change in another tab arrives through `storage`.
 *
 * Labels arrive as props. next-intl is deliberately kept out of the browser
 * bundle (see tests/unit/bundle-budget.test.ts), so no client component on
 * this site reads a message catalogue.
 */

export type Theme = 'auto' | 'light' | 'dark';

const THEMES: Theme[] = ['auto', 'light', 'dark'];

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the same site changed the choice.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function current(): Theme {
  const value = document.documentElement.getAttribute('data-theme');
  return value === 'light' || value === 'dark' ? value : 'auto';
}

/** The server cannot know the reader's choice; it renders "auto". */
const onServer = (): Theme => 'auto';

function choose(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  try {
    if (theme === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private window, blocked site data: the choice holds for this page only.
  }

  listeners.forEach((notify) => notify());
}

export function ThemeSwitch({
  legend,
  labels,
  className,
}: {
  legend: string;
  labels: Record<Theme, string>;
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribe, current, onServer);

  return (
    <div className={className}>
      <p
        className="text-ink-muted text-xs tracking-[0.18em] uppercase"
        id="theme-switch-label"
      >
        {legend}
      </p>
      <div
        role="group"
        aria-labelledby="theme-switch-label"
        className="border-border mt-3 flex w-fit max-w-full flex-wrap rounded-sm border"
      >
        {THEMES.map((option) => {
          const active = option === theme;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => choose(option)}
              className={`cursor-pointer px-3 py-1.5 text-xs first:rounded-s-sm last:rounded-e-sm ${
                active ? 'bg-accent-surface text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
